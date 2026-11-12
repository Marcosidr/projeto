import { prisma, type Transacao } from '../../lib/prisma';
import { AppError, conflito, naoEncontrado, proibido } from '../../utils/AppError';
import {
  adicionarMinutos,
  formatarHora,
  gerarSlots,
  haSobreposicao,
  limitesDoDia,
  paraHoraLocal,
  validarHorarioFuncionamento,
} from '../../utils/horario';
import type { Perfil, StatusAgendamento } from '../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../types/express';

/** Status que ocupam um box (bloqueiam o horário). */
export const STATUS_QUE_OCUPAM: StatusAgendamento[] = ['PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO'];

/**
 * Máquina de estados do agendamento: para cada status, as transições
 * permitidas e quem pode executá-las.
 */
export const TRANSICOES: Record<
  StatusAgendamento,
  Partial<Record<StatusAgendamento, Perfil[]>>
> = {
  PENDENTE: { CONFIRMADO: ['ADMIN'], RECUSADO: ['ADMIN'], CANCELADO: ['ADMIN', 'CLIENTE'] },
  CONFIRMADO: { EM_ANDAMENTO: ['ADMIN'], CANCELADO: ['ADMIN', 'CLIENTE'] },
  EM_ANDAMENTO: { CONCLUIDO: ['ADMIN'] },
  RECUSADO: {},
  CANCELADO: {},
  CONCLUIDO: {},
};

/** Id arbitrário usado no lock de transação do PostgreSQL. */
const LOCK_AGENDA = 727_001;

export const incluirDetalhes = {
  cliente: { select: { id: true, nome: true, email: true, telefone: true } },
  veiculo: { select: { id: true, placa: true, marca: true, modelo: true, ano: true, cor: true } },
  servico: { select: { id: true, nome: true, duracaoMinutos: true } },
  box: { select: { id: true, nome: true } },
} as const;

/**
 * Procura um box ativo sem agendamentos sobrepostos ao intervalo.
 * Retorna null quando todos estão ocupados.
 */
async function encontrarBoxLivre(tx: Transacao, inicio: Date, fim: Date) {
  // Consultas sequenciais: dentro da transação há uma única conexão.
  const boxes = await tx.box.findMany({ where: { ativo: true }, orderBy: { id: 'asc' } });
  const ocupados = await tx.agendamento.findMany({
    where: {
      status: { in: STATUS_QUE_OCUPAM },
      inicio: { lt: fim },
      fim: { gt: inicio },
    },
    select: { boxId: true },
  });

  const idsOcupados = new Set(ocupados.map((a) => a.boxId));
  return boxes.find((b) => !idsOcupados.has(b.id)) ?? null;
}

export async function consultarDisponibilidade(data: string, servicoId: number, agora = new Date()) {
  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico || !servico.ativo) throw naoEncontrado('Serviço');

  const { inicio: inicioDia, fim: fimDia } = limitesDoDia(data);
  const [boxes, agendamentos] = await Promise.all([
    prisma.box.findMany({ where: { ativo: true }, select: { id: true } }),
    prisma.agendamento.findMany({
      where: {
        status: { in: STATUS_QUE_OCUPAM },
        inicio: { lt: fimDia },
        fim: { gt: inicioDia },
      },
      select: { boxId: true, inicio: true, fim: true },
    }),
  ]);

  const horarios = gerarSlots(data, servico.duracaoMinutos).map((inicio) => {
    const fim = adicionarMinutos(inicio, servico.duracaoMinutos);
    const ocupados = new Set(
      agendamentos.filter((a) => haSobreposicao(inicio, fim, a.inicio, a.fim)).map((a) => a.boxId),
    );
    const boxesLivres = boxes.filter((b) => !ocupados.has(b.id)).length;
    return {
      inicio: inicio.toISOString(),
      horario: formatarHora(paraHoraLocal(inicio).minutos),
      boxesLivres,
      disponivel: boxesLivres > 0 && inicio > agora,
    };
  });

  return { data, servico: { id: servico.id, nome: servico.nome, duracaoMinutos: servico.duracaoMinutos }, horarios };
}

export async function criarAgendamento(
  usuario: UsuarioAutenticado,
  dados: { veiculoId: number; servicoId: number; inicio: Date; observacoes?: string; clienteId?: number },
) {
  // RN02 / RN08: o cliente agenda apenas para si; o administrador informa o cliente.
  let clienteId = usuario.id;
  if (usuario.perfil === 'ADMIN') {
    if (!dados.clienteId) throw new AppError('Informe o clienteId.', 400);
    clienteId = dados.clienteId;
  }

  const [cliente, veiculo, servico] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: clienteId } }),
    prisma.veiculo.findUnique({ where: { id: dados.veiculoId } }),
    prisma.servico.findUnique({ where: { id: dados.servicoId } }),
  ]);

  if (!cliente || cliente.perfil !== 'CLIENTE' || !cliente.ativo) throw naoEncontrado('Cliente');
  if (!veiculo || veiculo.clienteId !== clienteId) throw naoEncontrado('Veículo');
  if (!servico || !servico.ativo) throw naoEncontrado('Serviço');

  // RN03: serviço, data e horário obrigatórios e dentro do expediente.
  const inicio = dados.inicio;
  const fim = adicionarMinutos(inicio, servico.duracaoMinutos);
  validarHorarioFuncionamento(inicio, fim);

  return prisma.$transaction(async (tx) => {
    // Serializa a criação de agendamentos: duas solicitações simultâneas
    // não conseguem reservar o mesmo box.
    await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(${LOCK_AGENDA}::bigint)`;

    const mesmoVeiculo = await tx.agendamento.findFirst({
      where: {
        veiculoId: veiculo.id,
        status: { in: STATUS_QUE_OCUPAM },
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
    });
    if (mesmoVeiculo) {
      throw conflito('Este veículo já possui um agendamento nesse horário.');
    }

    // RN04: nenhum box pode ter dois agendamentos sobrepostos.
    const box = await encontrarBoxLivre(tx, inicio, fim);
    if (!box) {
      throw conflito('Horário indisponível: todos os boxes estão ocupados. Escolha outro horário.');
    }

    // RN05: todo agendamento nasce PENDENTE.
    const agendamento = await tx.agendamento.create({
      data: {
        clienteId,
        veiculoId: veiculo.id,
        servicoId: servico.id,
        boxId: box.id,
        inicio,
        fim,
        observacoes: dados.observacoes,
        precoCobrado: servico.preco,
        status: 'PENDENTE',
      },
      include: incluirDetalhes,
    });

    await tx.historicoStatus.create({
      data: {
        agendamentoId: agendamento.id,
        statusAnterior: null,
        statusNovo: 'PENDENTE',
        usuarioId: usuario.id,
        observacao: 'Solicitação criada',
      },
    });

    return agendamento;
  });
}

/** Garante que o usuário pode ver o agendamento (RN07 / RN08). */
export async function buscarAgendamentoAutorizado(usuario: UsuarioAutenticado, id: number) {
  const agendamento = await prisma.agendamento.findUnique({ where: { id } });
  if (!agendamento || (usuario.perfil === 'CLIENTE' && agendamento.clienteId !== usuario.id)) {
    throw naoEncontrado('Agendamento');
  }
  return agendamento;
}

export async function alterarStatus(
  usuario: UsuarioAutenticado,
  id: number,
  novoStatus: StatusAgendamento,
  observacao?: string,
) {
  const atual = await buscarAgendamentoAutorizado(usuario, id);
  const permitidos = TRANSICOES[atual.status][novoStatus];

  if (!permitidos) {
    throw new AppError(
      `Não é possível mudar o agendamento de ${atual.status} para ${novoStatus}.`,
      422,
    );
  }
  // RN06: apenas o administrador confirma, recusa e conduz o atendimento.
  if (!permitidos.includes(usuario.perfil)) throw proibido();

  if (novoStatus === 'RECUSADO' && !observacao?.trim()) {
    throw new AppError('Informe o motivo da recusa.', 400);
  }
  if (novoStatus === 'CANCELADO' && usuario.perfil === 'CLIENTE' && atual.inicio <= new Date()) {
    throw new AppError('Não é possível cancelar um agendamento cujo horário já passou.', 422);
  }

  return prisma.$transaction(async (tx) => {
    const agendamento = await tx.agendamento.update({
      where: { id },
      data: {
        status: novoStatus,
        motivoRecusa: novoStatus === 'RECUSADO' ? observacao : undefined,
      },
      include: incluirDetalhes,
    });
    await tx.historicoStatus.create({
      data: {
        agendamentoId: id,
        statusAnterior: atual.status,
        statusNovo: novoStatus,
        observacao,
        usuarioId: usuario.id,
      },
    });
    return agendamento;
  });
}
