import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { autenticar, autorizar } from '../../middlewares/autenticacao';
import { INTERVALO_SLOT_MIN, limitesDoDia } from '../../utils/horario';
import { dataSchema } from '../../utils/validacao';
import { STATUS_QUE_OCUPAM, incluirDetalhes } from '../agendamentos/agendamentos.service';

/** Agenda do dia, organizada por box — visão do administrador. */
export const agendaRoutes = Router();
agendaRoutes.use(autenticar, autorizar('ADMIN'));

agendaRoutes.get('/', async (req, res) => {
  const { data, todos } = z
    .object({ data: dataSchema, todos: z.enum(['true', 'false']).optional() })
    .parse(req.query);

  const { inicio, fim } = limitesDoDia(data);
  const boxes = await prisma.box.findMany({
    orderBy: { id: 'asc' },
    include: {
      agendamentos: {
        where: {
          inicio: { gte: inicio, lt: fim },
          status: todos === 'true' ? undefined : { in: STATUS_QUE_OCUPAM },
        },
        include: incluirDetalhes,
        orderBy: { inicio: 'asc' },
      },
    },
  });

  const resumo = await prisma.agendamento.groupBy({
    by: ['status'],
    where: { inicio: { gte: inicio, lt: fim } },
    _count: { _all: true },
  });

  res.json({
    data,
    expediente: {
      abertura: env.OFICINA_ABERTURA,
      fechamento: env.OFICINA_FECHAMENTO,
      intervaloMinutos: INTERVALO_SLOT_MIN,
    },
    resumo: Object.fromEntries(resumo.map((r) => [r.status, r._count._all])),
    boxes,
  });
});
