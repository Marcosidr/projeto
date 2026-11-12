import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, autorizar } from '../../middlewares/autenticacao';
import { conflito } from '../../utils/AppError';
import { lerId } from '../../utils/validacao';

/** Boxes / elevadores: o recurso disputado pelos agendamentos. */
export const boxesRoutes = Router();
boxesRoutes.use(autenticar, autorizar('ADMIN'));

const boxSchema = z.object({
  nome: z.string().trim().min(1).max(40),
  ativo: z.boolean().optional(),
});

boxesRoutes.get('/', async (_req, res) => {
  res.json(await prisma.box.findMany({ orderBy: { id: 'asc' } }));
});

boxesRoutes.post('/', async (req, res) => {
  const dados = boxSchema.parse(req.body);
  if (await prisma.box.findUnique({ where: { nome: dados.nome } })) {
    throw conflito('Já existe um box com este nome.');
  }
  res.status(201).json(await prisma.box.create({ data: dados }));
});

boxesRoutes.put('/:id', async (req, res) => {
  const dados = boxSchema.partial().parse(req.body);
  res.json(await prisma.box.update({ where: { id: lerId(req.params.id) }, data: dados }));
});
