import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import {
  api,
  cenarioAgendamento,
  criarUsuario,
  criarVeiculo,
  diaUtil,
  horario,
  limparBanco,
  proximoDia,
} from './helpers';

beforeEach(limparBanco);

function agendar(auth: string, dados: Record<string, unknown>) {
  return api().post('/agendamentos').set('Authorization', auth).send(dados);
}

describe('Solicitação de agendamento (RN02, RN03, RN05)', () => {
  it('cria o agendamento como PENDENTE, reserva um box e registra o histórico', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    const res = await agendar(cliente.auth, {
      veiculoId: veiculo.id,
      servicoId: servico.id,
      inicio: horario(diaUtil(), '09:00'),
      observacoes: 'Barulho no freio',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDENTE');
    expect(res.body.box.nome).toBe('Box 1');
    expect(new Date(res.body.fim).getTime() - new Date(res.body.inicio).getTime()).toBe(60 * 60_000);

    const historico = await prisma.historicoStatus.findMany({ where: { agendamentoId: res.body.id } });
    expect(historico).toHaveLength(1);
    expect(historico[0].statusNovo).toBe('PENDENTE');
  });

  it('exige veículo, serviço e horário', async () => {
    const { cliente } = await cenarioAgendamento(1);
    const res = await agendar(cliente.auth, {});
    expect(res.status).toBe(400);
    const campos = res.body.detalhes.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['veiculoId', 'servicoId', 'inicio']));
  });

  it('recusa horários no passado, aos domingos, fora do expediente e fora do intervalo de 30 min', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    const base = { veiculoId: veiculo.id, servicoId: servico.id };

    expect((await agendar(cliente.auth, { ...base, inicio: '2020-01-07T09:00:00-03:00' })).status).toBe(422);
    expect((await agendar(cliente.auth, { ...base, inicio: horario(proximoDia(0), '09:00') })).status).toBe(422);
    expect((await agendar(cliente.auth, { ...base, inicio: horario(diaUtil(), '07:00') })).status).toBe(422);
    // começa 17:30 e terminaria 18:30, depois do fechamento
    expect((await agendar(cliente.auth, { ...base, inicio: horario(diaUtil(), '17:30') })).status).toBe(422);
    expect((await agendar(cliente.auth, { ...base, inicio: horario(diaUtil(), '09:15') })).status).toBe(422);
    // 17:00 + 60 min termina exatamente às 18:00: permitido
    expect((await agendar(cliente.auth, { ...base, inicio: horario(diaUtil(), '17:00') })).status).toBe(201);
  });

  it('administrador agenda em nome de um cliente', async () => {
    const { admin, cliente, veiculo, servico } = await cenarioAgendamento(1);
    const res = await agendar(admin.auth, {
      clienteId: cliente.usuario.id,
      veiculoId: veiculo.id,
      servicoId: servico.id,
      inicio: horario(diaUtil(), '10:00'),
    });
    expect(res.status).toBe(201);
    expect(res.body.clienteId).toBe(cliente.usuario.id);
  });
});

describe('Conflito de horários por box (RN04)', () => {
  it('com 1 box, não permite dois agendamentos sobrepostos', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    const outroVeiculo = await criarVeiculo(cliente.usuario.id);
    const dia = diaUtil();

    expect((await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(dia, '09:00') })).status).toBe(201);

    // mesmo horário
    const igual = await agendar(cliente.auth, { veiculoId: outroVeiculo.id, servicoId: servico.id, inicio: horario(dia, '09:00') });
    expect(igual.status).toBe(409);

    // sobreposição parcial (09:30 às 10:30)
    const parcial = await agendar(cliente.auth, { veiculoId: outroVeiculo.id, servicoId: servico.id, inicio: horario(dia, '09:30') });
    expect(parcial.status).toBe(409);

    // horário seguinte, sem sobreposição (10:00 às 11:00)
    const seguinte = await agendar(cliente.auth, { veiculoId: outroVeiculo.id, servicoId: servico.id, inicio: horario(dia, '10:00') });
    expect(seguinte.status).toBe(201);
  });

  it('com 2 boxes, aceita dois no mesmo horário e recusa o terceiro', async () => {
    const { veiculo, servico, cliente } = await cenarioAgendamento(2);
    const outro = await criarUsuario('CLIENTE');
    const terceiro = await criarUsuario('CLIENTE');
    const v2 = await criarVeiculo(outro.usuario.id);
    const v3 = await criarVeiculo(terceiro.usuario.id);
    const inicio = horario(diaUtil(), '14:00');

    const a = await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio });
    const b = await agendar(outro.auth, { veiculoId: v2.id, servicoId: servico.id, inicio });
    const c = await agendar(terceiro.auth, { veiculoId: v3.id, servicoId: servico.id, inicio });

    expect([a.status, b.status, c.status]).toEqual([201, 201, 409]);
    expect(a.body.box.id).not.toBe(b.body.box.id);
  });

  it('o mesmo veículo não pode ter dois agendamentos sobrepostos', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(3);
    const inicio = horario(diaUtil(), '09:00');
    expect((await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio })).status).toBe(201);
    expect((await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio })).status).toBe(409);
  });

  it('solicitações simultâneas não ultrapassam a quantidade de boxes', async () => {
    await cenarioAgendamento(2);
    const servico = await prisma.servico.findFirstOrThrow();
    const clientes = await Promise.all(Array.from({ length: 5 }, () => criarUsuario('CLIENTE')));
    const veiculos = await Promise.all(clientes.map((c) => criarVeiculo(c.usuario.id)));
    const inicio = horario(diaUtil(), '11:00');

    const respostas = await Promise.all(
      clientes.map((c, i) => agendar(c.auth, { veiculoId: veiculos[i].id, servicoId: servico.id, inicio })),
    );

    const status = respostas.map((r) => r.status).sort();
    expect(status).toEqual([201, 201, 409, 409, 409]);
  });

  it('cancelar libera o horário para outro cliente', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    const outro = await criarUsuario('CLIENTE');
    const v2 = await criarVeiculo(outro.usuario.id);
    const inicio = horario(diaUtil(), '15:00');

    const primeiro = await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio });
    expect((await agendar(outro.auth, { veiculoId: v2.id, servicoId: servico.id, inicio })).status).toBe(409);

    await api().patch(`/agendamentos/${primeiro.body.id}/cancelar`).set('Authorization', cliente.auth);

    expect((await agendar(outro.auth, { veiculoId: v2.id, servicoId: servico.id, inicio })).status).toBe(201);
  });

  it('a consulta de disponibilidade reflete os boxes ocupados', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    const dia = diaUtil();
    await agendar(cliente.auth, { veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(dia, '09:00') });

    const res = await api()
      .get(`/agendamentos/disponibilidade?data=${dia}&servicoId=${servico.id}`)
      .set('Authorization', cliente.auth);

    expect(res.status).toBe(200);
    const porHorario = Object.fromEntries(
      res.body.horarios.map((h: { horario: string; disponivel: boolean }) => [h.horario, h.disponivel]),
    );
    expect(porHorario['08:00']).toBe(true);
    expect(porHorario['08:30']).toBe(false); // 08:30-09:30 sobrepõe
    expect(porHorario['09:00']).toBe(false);
    expect(porHorario['09:30']).toBe(false);
    expect(porHorario['10:00']).toBe(true);
    expect(porHorario['17:00']).toBe(true);
    expect(porHorario['17:30']).toBeUndefined(); // não cabe no expediente
  });
});

describe('Ciclo de vida do agendamento', () => {
  async function criarPendente() {
    const cenario = await cenarioAgendamento(1);
    const res = await agendar(cenario.cliente.auth, {
      veiculoId: cenario.veiculo.id,
      servicoId: cenario.servico.id,
      inicio: horario(diaUtil(), '09:00'),
    });
    return { ...cenario, id: res.body.id as number };
  }

  it('segue PENDENTE → CONFIRMADO → EM_ANDAMENTO → CONCLUIDO', async () => {
    const { admin, cliente, id } = await criarPendente();

    for (const [acao, status] of [
      ['confirmar', 'CONFIRMADO'],
      ['iniciar', 'EM_ANDAMENTO'],
      ['concluir', 'CONCLUIDO'],
    ]) {
      const res = await api().patch(`/agendamentos/${id}/${acao}`).set('Authorization', admin.auth);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }

    const detalhe = await api().get(`/agendamentos/${id}`).set('Authorization', cliente.auth);
    expect(detalhe.body.historico.map((h: { statusNovo: string }) => h.statusNovo)).toEqual([
      'PENDENTE',
      'CONFIRMADO',
      'EM_ANDAMENTO',
      'CONCLUIDO',
    ]);
  });

  it('recusa exige motivo e é registrada', async () => {
    const { admin, id } = await criarPendente();
    expect((await api().patch(`/agendamentos/${id}/recusar`).set('Authorization', admin.auth).send({})).status).toBe(400);

    const res = await api()
      .patch(`/agendamentos/${id}/recusar`)
      .set('Authorization', admin.auth)
      .send({ motivo: 'Peça indisponível' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RECUSADO');
    expect(res.body.motivoRecusa).toBe('Peça indisponível');
  });

  it('impede transições inválidas', async () => {
    const { admin, cliente, id } = await criarPendente();

    // não pode concluir sem iniciar
    expect((await api().patch(`/agendamentos/${id}/concluir`).set('Authorization', admin.auth)).status).toBe(422);

    await api().patch(`/agendamentos/${id}/confirmar`).set('Authorization', admin.auth);
    await api().patch(`/agendamentos/${id}/iniciar`).set('Authorization', admin.auth);

    // em andamento não pode ser cancelado
    expect((await api().patch(`/agendamentos/${id}/cancelar`).set('Authorization', cliente.auth)).status).toBe(422);
  });

  it('o veículo guarda o histórico de atendimentos', async () => {
    const { admin, cliente, veiculo, id } = await criarPendente();
    await api().patch(`/agendamentos/${id}/confirmar`).set('Authorization', admin.auth);

    const res = await api().get(`/veiculos/${veiculo.id}/historico`).set('Authorization', cliente.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('CONFIRMADO');
  });

  it('a agenda do administrador mostra o dia organizado por box', async () => {
    const { admin } = await criarPendente();
    const res = await api().get(`/agenda?data=${diaUtil()}`).set('Authorization', admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.boxes).toHaveLength(1);
    expect(res.body.boxes[0].agendamentos).toHaveLength(1);
    expect(res.body.resumo.PENDENTE).toBe(1);
  });
});
