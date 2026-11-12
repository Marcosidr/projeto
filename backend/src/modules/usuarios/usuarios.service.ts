import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { conflito } from '../../utils/AppError';
import type { Perfil } from '../../generated/prisma/enums';

export const CUSTO_BCRYPT = 10;

/** Campos públicos do usuário (nunca expõe o hash da senha). */
export const usuarioPublico = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
} as const;

export async function garantirEmailDisponivel(email: string, ignorarId?: number) {
  const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existente && existente.id !== ignorarId) {
    throw conflito('Este e-mail já está cadastrado.');
  }
}

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  perfil?: Perfil;
}) {
  await garantirEmailDisponivel(dados.email);
  return prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      perfil: dados.perfil ?? 'CLIENTE',
      senhaHash: await bcrypt.hash(dados.senha, CUSTO_BCRYPT),
    },
    select: usuarioPublico,
  });
}
