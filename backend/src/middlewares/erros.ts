import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { removerArquivos } from './upload';

export function rotaNaoEncontrada(req: Request, res: Response) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não encontrada.` });
}

export function tratarErros(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Se a requisição falhou depois do upload, os arquivos salvos são descartados.
  if (Array.isArray(req.files)) removerArquivos(req.files);

  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    });
  }

  if (err instanceof multer.MulterError) {
    const mensagens: Partial<Record<multer.ErrorCode, [number, string]>> = {
      LIMIT_FILE_SIZE: [413, `Cada imagem pode ter no máximo ${env.UPLOAD_MAX_MB} MB.`],
      LIMIT_FILE_COUNT: [400, 'Muitos arquivos enviados de uma vez.'],
      LIMIT_UNEXPECTED_FILE: [400, 'Envie as imagens no campo "imagens" (máximo de 5).'],
    };
    const [status, erro] = mensagens[err.code] ?? [400, err.message];
    return res.status(status).json({ erro });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Já existe um registro com esses dados.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ erro: 'Operação bloqueada: o registro está vinculado a outros dados.' });
    }
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}
