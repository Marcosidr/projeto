import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, autenticarOpcional, autorizar } from '../../middlewares/autenticacao';
import { conflito, naoEncontrado } from '../../utils/AppError';
import { lerId } from '../../utils/validacao';

export const servicosRoutes = Router();

const servicoSchema = z.object({
  nome: z.string().trim().min(3).max(100),
  descricao: z.string().trim().min(5).max(1000),
  preco: z.coerce.number().min(0).max(1_000_000),
  duracaoMinutos: z.coerce
    .number()
    .int()
    .min(30, 'Duração mínima de 30 minutos')
    .max(600)
    .refine((n) => n % 30 === 0, 'A duração deve ser múltipla de 30 minutos'),
  ativo: z.boolean().optional(),
});

async function garantirNomeDisponivel(nome: string, ignorarId?: number) {
  const existente = await prisma.servico.findUnique({ where: { nome }, select: { id: true } });
  if (existente && existente.id !== ignorarId) throw conflito('Já existe um serviço com este nome.');
}

/**
 * Lista pública de serviços ativos. O administrador pode passar
 * ?todos=true para incluir os inativos.
 */
servicosRoutes.get('/', autenticarOpcional, async (req, res) => {
  const todos = req.query.todos === 'true' && req.usuario?.perfil === 'ADMIN';
  const servicos = await prisma.servico.findMany({
    where: todos ? undefined : { ativo: true },
    orderBy: { nome: 'asc' },
  });
  res.json(servicos);
});

servicosRoutes.get('/:id', autenticarOpcional, async (req, res) => {
  const servico = await prisma.servico.findUnique({ where: { id: lerId(req.params.id) } });
  if (!servico || (!servico.ativo && req.usuario?.perfil !== 'ADMIN')) {
    throw naoEncontrado('Serviço');
  }
  res.json(servico);
});

servicosRoutes.post('/', autenticar, autorizar('ADMIN'), async (req, res) => {
  const dados = servicoSchema.parse(req.body);
  await garantirNomeDisponivel(dados.nome);
  const servico = await prisma.servico.create({ data: dados });
  res.status(201).json(servico);
});

servicosRoutes.put('/:id', autenticar, autorizar('ADMIN'), async (req, res) => {
  const id = lerId(req.params.id);
  const dados = servicoSchema.partial().parse(req.body);
  if (dados.nome) await garantirNomeDisponivel(dados.nome, id);
  const servico = await prisma.servico.update({ where: { id }, data: dados });
  res.json(servico);
});

/**
 * Serviços já usados em agendamentos são apenas desativados,
 * preservando o histórico.
 */
servicosRoutes.delete('/:id', autenticar, autorizar('ADMIN'), async (req, res) => {
  const id = lerId(req.params.id);
  const usos = await prisma.agendamento.count({ where: { servicoId: id } });

  if (usos > 0) {
    const servico = await prisma.servico.update({ where: { id }, data: { ativo: false } });
    return res.json({ mensagem: 'Serviço possui histórico e foi desativado.', servico });
  }

  await prisma.servico.delete({ where: { id } });
  res.status(204).end();
});
