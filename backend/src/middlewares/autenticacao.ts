import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError, proibido } from '../utils/AppError';
import type { Perfil } from '../generated/prisma/enums';
import type { UsuarioAutenticado } from '../types/express';

interface TokenPayload {
  sub: string;
}

export function gerarToken(usuarioId: number) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(usuarioId),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function carregarUsuario(header: string | undefined): Promise<UsuarioAutenticado> {
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Token de autenticação não informado.', 401);
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
  } catch {
    throw new AppError('Token inválido ou expirado.', 401);
  }

  // O usuário é lido do banco a cada requisição, assim uma alteração de
  // permissão ou desativação passa a valer imediatamente.
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });

  if (!usuario) throw new AppError('Usuário não encontrado.', 401);
  if (!usuario.ativo) throw new AppError('Conta desativada. Procure a oficina.', 403);

  const { ativo: _ativo, ...dados } = usuario;
  return dados;
}

/** Exige um usuário autenticado. */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  req.usuario = await carregarUsuario(req.headers.authorization);
  next();
}

/** Autentica se houver token, mas não exige. */
export async function autenticarOpcional(req: Request, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    req.usuario = await carregarUsuario(req.headers.authorization);
  }
  next();
}

/** Restringe a rota aos perfis informados. Use depois de `autenticar`. */
export function autorizar(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      throw proibido();
    }
    next();
  };
}

/** Atalho para obter o usuário em rotas protegidas. */
export function usuarioDa(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new AppError('Não autenticado.', 401);
  return req.usuario;
}
