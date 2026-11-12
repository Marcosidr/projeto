import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, autorizar, usuarioDa } from '../../middlewares/autenticacao';
import { AppError, conflito, naoEncontrado } from '../../utils/AppError';
import { emailSchema, lerId, senhaSchema, telefoneSchema } from '../../utils/validacao';
import type { Prisma } from '../../generated/prisma/client';
import {
  CUSTO_BCRYPT,
  criarUsuario,
  garantirEmailDisponivel,
  usuarioPublico,
} from './usuarios.service';

/**
 * Gestão de clientes e usuários — exclusiva do administrador.
 * Clientes são usuários com perfil CLIENTE.
 */
export const usuariosRoutes = Router();
usuariosRoutes.use(autenticar, autorizar('ADMIN'));

const perfilSchema = z.enum(['CLIENTE', 'ADMIN']);

const filtrosSchema = z.object({
  perfil: perfilSchema.optional(),
  ativo: z.enum(['true', 'false']).optional(),
  busca: z.string().trim().optional(),
});

const criarSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  email: emailSchema,
  senha: senhaSchema,
  telefone: telefoneSchema.optional(),
  perfil: perfilSchema.default('CLIENTE'),
});

const atualizarSchema = z.object({
  nome: z.string().trim().min(3).max(120).optional(),
  email: emailSchema.optional(),
  telefone: telefoneSchema.nullable().optional(),
  senha: senhaSchema.optional(),
});

const permissoesSchema = z
  .object({ perfil: perfilSchema.optional(), ativo: z.boolean().optional() })
  .refine((d) => d.perfil !== undefined || d.ativo !== undefined, {
    message: 'Informe perfil e/ou ativo',
  });

usuariosRoutes.get('/', async (req, res) => {
  const { perfil, ativo, busca } = filtrosSchema.parse(req.query);

  const where: Prisma.UsuarioWhereInput = {
    perfil,
    ativo: ativo === undefined ? undefined : ativo === 'true',
    OR: busca
      ? [
          { nome: { contains: busca, mode: 'insensitive' } },
          { email: { contains: busca, mode: 'insensitive' } },
          { telefone: { contains: busca } },
          { veiculos: { some: { placa: { contains: busca.toUpperCase().replace(/[^A-Z0-9]/g, '') } } } },
        ]
      : undefined,
  };

  const usuarios = await prisma.usuario.findMany({
    where,
    select: { ...usuarioPublico, _count: { select: { veiculos: true, agendamentos: true } } },
    orderBy: { nome: 'asc' },
  });
  res.json(usuarios);
});

usuariosRoutes.get('/:id', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: lerId(req.params.id) },
    select: {
      ...usuarioPublico,
      veiculos: { orderBy: { criadoEm: 'desc' } },
      agendamentos: {
        orderBy: { inicio: 'desc' },
        take: 20,
        include: { servico: { select: { nome: true } }, veiculo: { select: { placa: true, modelo: true } } },
      },
    },
  });
  if (!usuario) throw naoEncontrado('Usuário');
  res.json(usuario);
});

usuariosRoutes.post('/', async (req, res) => {
  const usuario = await criarUsuario(criarSchema.parse(req.body));
  res.status(201).json(usuario);
});

usuariosRoutes.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const dados = atualizarSchema.parse(req.body);

  if (dados.email) await garantirEmailDisponivel(dados.email, id);

  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      senhaHash: dados.senha ? await bcrypt.hash(dados.senha, CUSTO_BCRYPT) : undefined,
    },
    select: usuarioPublico,
  });
  res.json(usuario);
});

/** Altera perfil (CLIENTE/ADMIN) e/ou ativa/desativa a conta. */
usuariosRoutes.patch('/:id/permissoes', async (req, res) => {
  const id = lerId(req.params.id);
  const dados = permissoesSchema.parse(req.body);

  if (id === usuarioDa(req).id) {
    throw new AppError('Você não pode alterar as próprias permissões.', 422);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: dados,
    select: usuarioPublico,
  });
  res.json(usuario);
});

usuariosRoutes.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);

  if (id === usuarioDa(req).id) {
    throw new AppError('Você não pode excluir a própria conta.', 422);
  }

  const agendamentos = await prisma.agendamento.count({ where: { clienteId: id } });
  if (agendamentos > 0) {
    throw conflito('Este cliente possui agendamentos e não pode ser excluído. Desative a conta em vez disso.');
  }

  await prisma.usuario.delete({ where: { id } });
  res.status(204).end();
});
