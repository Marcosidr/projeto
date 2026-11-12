import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, usuarioDa } from '../../middlewares/autenticacao';
import { AppError, conflito, naoEncontrado } from '../../utils/AppError';
import { lerId } from '../../utils/validacao';
import type { UsuarioAutenticado } from '../../types/express';

export const veiculosRoutes = Router();
veiculosRoutes.use(autenticar);

const anoAtual = new Date().getFullYear();

/** Aceita placa no padrão antigo (ABC1234) e Mercosul (ABC1D23). */
const placaSchema = z
  .string()
  .transform((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .refine((p) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p), 'Placa inválida (ex.: ABC1D23 ou ABC1234)');

const veiculoSchema = z.object({
  placa: placaSchema,
  marca: z.string().trim().min(2).max(60),
  modelo: z.string().trim().min(1).max(60),
  ano: z.coerce.number().int().min(1950).max(anoAtual + 1),
  cor: z.string().trim().max(30).optional(),
  quilometragem: z.coerce.number().int().min(0).max(2_000_000).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
});

/**
 * Busca um veículo respeitando a regra de acesso: o cliente só enxerga os
 * próprios veículos. Para não revelar dados de terceiros, responde 404.
 */
export async function buscarVeiculoAutorizado(usuario: UsuarioAutenticado, id: number) {
  const veiculo = await prisma.veiculo.findUnique({ where: { id } });
  if (!veiculo || (usuario.perfil === 'CLIENTE' && veiculo.clienteId !== usuario.id)) {
    throw naoEncontrado('Veículo');
  }
  return veiculo;
}

async function garantirPlacaDisponivel(placa: string, ignorarId?: number) {
  const existente = await prisma.veiculo.findUnique({ where: { placa }, select: { id: true } });
  if (existente && existente.id !== ignorarId) throw conflito('Já existe um veículo com esta placa.');
}

veiculosRoutes.get('/', async (req, res) => {
  const usuario = usuarioDa(req);
  const clienteId =
    usuario.perfil === 'CLIENTE'
      ? usuario.id
      : req.query.clienteId
        ? lerId(req.query.clienteId)
        : undefined;

  const veiculos = await prisma.veiculo.findMany({
    where: { clienteId },
    include: {
      cliente: usuario.perfil === 'ADMIN' ? { select: { id: true, nome: true } } : false,
      _count: { select: { agendamentos: true, imagens: true } },
    },
    orderBy: { criadoEm: 'desc' },
  });
  res.json(veiculos);
});

veiculosRoutes.get('/:id', async (req, res) => {
  const veiculo = await buscarVeiculoAutorizado(usuarioDa(req), lerId(req.params.id));
  const completo = await prisma.veiculo.findUniqueOrThrow({
    where: { id: veiculo.id },
    include: {
      cliente: { select: { id: true, nome: true, email: true, telefone: true } },
      imagens: { orderBy: { criadoEm: 'desc' } },
    },
  });
  res.json(completo);
});

/** Histórico de serviços e atendimentos do veículo. */
veiculosRoutes.get('/:id/historico', async (req, res) => {
  const veiculo = await buscarVeiculoAutorizado(usuarioDa(req), lerId(req.params.id));
  const historico = await prisma.agendamento.findMany({
    where: { veiculoId: veiculo.id },
    include: { servico: { select: { id: true, nome: true } }, box: { select: { nome: true } } },
    orderBy: { inicio: 'desc' },
  });
  res.json(historico);
});

veiculosRoutes.post('/', async (req, res) => {
  const usuario = usuarioDa(req);
  const { clienteId: clienteInformado, ...dados } = veiculoSchema.parse(req.body);

  // Cliente cadastra para si mesmo; administrador informa o dono do veículo.
  let clienteId = usuario.id;
  if (usuario.perfil === 'ADMIN') {
    if (!clienteInformado) throw new AppError('Informe o clienteId do dono do veículo.', 400);
    const cliente = await prisma.usuario.findUnique({ where: { id: clienteInformado } });
    if (!cliente || cliente.perfil !== 'CLIENTE') throw naoEncontrado('Cliente');
    clienteId = clienteInformado;
  }

  await garantirPlacaDisponivel(dados.placa);
  const veiculo = await prisma.veiculo.create({ data: { ...dados, clienteId } });
  res.status(201).json(veiculo);
});

veiculosRoutes.put('/:id', async (req, res) => {
  const atual = await buscarVeiculoAutorizado(usuarioDa(req), lerId(req.params.id));
  const { clienteId: _ignorado, ...dados } = veiculoSchema.partial().parse(req.body);
  if (dados.placa) await garantirPlacaDisponivel(dados.placa, atual.id);
  const veiculo = await prisma.veiculo.update({ where: { id: atual.id }, data: dados });
  res.json(veiculo);
});

veiculosRoutes.delete('/:id', async (req, res) => {
  const veiculo = await buscarVeiculoAutorizado(usuarioDa(req), lerId(req.params.id));
  const agendamentos = await prisma.agendamento.count({ where: { veiculoId: veiculo.id } });
  if (agendamentos > 0) {
    throw conflito('Este veículo possui histórico de agendamentos e não pode ser excluído.');
  }
  await prisma.veiculo.delete({ where: { id: veiculo.id } });
  res.status(204).end();
});
