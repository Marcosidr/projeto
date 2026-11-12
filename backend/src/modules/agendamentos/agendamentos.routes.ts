import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, autorizar, usuarioDa } from '../../middlewares/autenticacao';
import { limitesDoDia } from '../../utils/horario';
import { dataSchema, lerId } from '../../utils/validacao';
import type { Prisma } from '../../generated/prisma/client';
import type { StatusAgendamento } from '../../generated/prisma/enums';
import {
  alterarStatus,
  buscarAgendamentoAutorizado,
  consultarDisponibilidade,
  criarAgendamento,
  incluirDetalhes,
} from './agendamentos.service';

export const agendamentosRoutes = Router();
agendamentosRoutes.use(autenticar);

const statusSchema = z.enum(['PENDENTE', 'CONFIRMADO', 'RECUSADO', 'CANCELADO', 'EM_ANDAMENTO', 'CONCLUIDO']);

const criarSchema = z.object({
  veiculoId: z.coerce.number().int().positive(),
  servicoId: z.coerce.number().int().positive(),
  inicio: z.iso.datetime({ offset: true, message: 'Data/hora inválida (use ISO 8601)' }).transform((s) => new Date(s)),
  observacoes: z.string().trim().max(500).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
});

const filtrosSchema = z.object({
  status: z
    .string()
    .transform((s) => s.split(','))
    .pipe(z.array(statusSchema))
    .optional(),
  data: dataSchema.optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  veiculoId: z.coerce.number().int().positive().optional(),
});

const observacaoSchema = z.object({ observacao: z.string().trim().max(500).optional() });
const recusaSchema = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo da recusa').max(500) });

/** Horários livres de um dia para um serviço. */
agendamentosRoutes.get('/disponibilidade', async (req, res) => {
  const { data, servicoId } = z
    .object({ data: dataSchema, servicoId: z.coerce.number().int().positive() })
    .parse(req.query);
  res.json(await consultarDisponibilidade(data, servicoId));
});

/** Cliente vê apenas os próprios; administrador vê todos e pode filtrar. */
agendamentosRoutes.get('/', async (req, res) => {
  const usuario = usuarioDa(req);
  const filtros = filtrosSchema.parse(req.query);

  const where: Prisma.AgendamentoWhereInput = {
    clienteId: usuario.perfil === 'CLIENTE' ? usuario.id : filtros.clienteId,
    veiculoId: filtros.veiculoId,
    status: filtros.status ? { in: filtros.status } : undefined,
  };
  if (filtros.data) {
    const { inicio, fim } = limitesDoDia(filtros.data);
    where.inicio = { gte: inicio, lt: fim };
  }

  const agendamentos = await prisma.agendamento.findMany({
    where,
    include: incluirDetalhes,
    orderBy: { inicio: 'desc' },
  });
  res.json(agendamentos);
});

agendamentosRoutes.get('/:id', async (req, res) => {
  const { id } = await buscarAgendamentoAutorizado(usuarioDa(req), lerId(req.params.id));
  const agendamento = await prisma.agendamento.findUniqueOrThrow({
    where: { id },
    include: {
      ...incluirDetalhes,
      servico: true,
      historico: {
        orderBy: { criadoEm: 'asc' },
        include: { usuario: { select: { nome: true, perfil: true } } },
      },
      imagens: { orderBy: { criadoEm: 'desc' } },
    },
  });
  res.json(agendamento);
});

agendamentosRoutes.post('/', async (req, res) => {
  const agendamento = await criarAgendamento(usuarioDa(req), criarSchema.parse(req.body));
  res.status(201).json(agendamento);
});

function rotaDeStatus(status: StatusAgendamento): RequestHandler {
  return async (req, res) => {
    const { observacao } = observacaoSchema.parse(req.body ?? {});
    res.json(await alterarStatus(usuarioDa(req), lerId(req.params.id), status, observacao));
  };
}

agendamentosRoutes.patch('/:id/cancelar', rotaDeStatus('CANCELADO'));
agendamentosRoutes.patch('/:id/confirmar', autorizar('ADMIN'), rotaDeStatus('CONFIRMADO'));
agendamentosRoutes.patch('/:id/iniciar', autorizar('ADMIN'), rotaDeStatus('EM_ANDAMENTO'));
agendamentosRoutes.patch('/:id/concluir', autorizar('ADMIN'), rotaDeStatus('CONCLUIDO'));

agendamentosRoutes.patch('/:id/recusar', autorizar('ADMIN'), async (req, res) => {
  const { motivo } = recusaSchema.parse(req.body ?? {});
  res.json(await alterarStatus(usuarioDa(req), lerId(req.params.id), 'RECUSADO', motivo));
});
