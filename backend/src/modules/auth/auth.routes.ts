import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, gerarToken, usuarioDa } from '../../middlewares/autenticacao';
import { AppError } from '../../utils/AppError';
import { emailSchema, senhaSchema, telefoneSchema } from '../../utils/validacao';
import {
  CUSTO_BCRYPT,
  criarUsuario,
  garantirEmailDisponivel,
  usuarioPublico,
} from '../usuarios/usuarios.service';

export const authRoutes = Router();

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
  email: emailSchema,
  senha: senhaSchema,
  telefone: telefoneSchema.optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha'),
});

const atualizarPerfilSchema = z
  .object({
    nome: z.string().trim().min(3).max(120).optional(),
    email: emailSchema.optional(),
    telefone: telefoneSchema.nullable().optional(),
    senhaAtual: z.string().optional(),
    novaSenha: senhaSchema.optional(),
  })
  .refine((d) => !d.novaSenha || d.senhaAtual, {
    message: 'Informe a senha atual para definir uma nova senha',
    path: ['senhaAtual'],
  });

/** Cadastro público: sempre cria um CLIENTE. */
authRoutes.post('/cadastro', async (req, res) => {
  const dados = cadastroSchema.parse(req.body);
  const usuario = await criarUsuario({ ...dados, perfil: 'CLIENTE' });
  res.status(201).json({ usuario, token: gerarToken(usuario.id) });
});

authRoutes.post('/login', async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;

  // Mesma mensagem para e-mail ou senha errados, para não revelar contas existentes.
  if (!usuario || !senhaConfere) {
    throw new AppError('E-mail ou senha incorretos.', 401);
  }
  if (!usuario.ativo) {
    throw new AppError('Conta desativada. Procure a oficina.', 403);
  }

  const { senhaHash: _hash, ...dados } = usuario;
  res.json({ usuario: dados, token: gerarToken(usuario.id) });
});

authRoutes.get('/me', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuarioDa(req).id },
    select: { ...usuarioPublico, _count: { select: { veiculos: true, agendamentos: true } } },
  });
  res.json(usuario);
});

authRoutes.put('/me', autenticar, async (req, res) => {
  const { id } = usuarioDa(req);
  const dados = atualizarPerfilSchema.parse(req.body);

  if (dados.email) await garantirEmailDisponivel(dados.email, id);

  let senhaHash: string | undefined;
  if (dados.novaSenha) {
    const atual = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    if (!(await bcrypt.compare(dados.senhaAtual!, atual.senhaHash))) {
      throw new AppError('Senha atual incorreta.', 400);
    }
    senhaHash = await bcrypt.hash(dados.novaSenha, CUSTO_BCRYPT);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: { nome: dados.nome, email: dados.email, telefone: dados.telefone, senhaHash },
    select: usuarioPublico,
  });
  res.json(usuario);
});
