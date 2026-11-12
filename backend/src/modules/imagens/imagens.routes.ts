import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { autenticar, usuarioDa } from '../../middlewares/autenticacao';
import {
  PASTA_UPLOADS,
  conteudoEhImagemValida,
  removerArquivos,
  uploadImagens,
} from '../../middlewares/upload';
import { AppError, naoEncontrado } from '../../utils/AppError';
import { lerId } from '../../utils/validacao';
import { buscarVeiculoAutorizado } from '../veiculos/veiculos.routes';

export const imagensRoutes = Router();
imagensRoutes.use(autenticar);

const camposSchema = z.object({
  agendamentoId: z.coerce.number().int().positive().optional(),
});

/** Envio de fotos do veículo (campo multipart "imagens", até 5 arquivos). */
imagensRoutes.post('/veiculos/:id/imagens', uploadImagens, async (req, res) => {
  const usuario = usuarioDa(req);
  const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (arquivos.length === 0) {
    throw new AppError('Nenhuma imagem enviada. Use o campo "imagens".', 400);
  }

  const veiculo = await buscarVeiculoAutorizado(usuario, lerId(req.params.id));
  const { agendamentoId } = camposSchema.parse(req.body);

  if (agendamentoId) {
    const agendamento = await prisma.agendamento.findUnique({ where: { id: agendamentoId } });
    if (!agendamento || agendamento.veiculoId !== veiculo.id) {
      throw new AppError('O agendamento informado não pertence a este veículo.', 422);
    }
  }

  const invalidos = arquivos.filter((a) => !conteudoEhImagemValida(a.path, a.mimetype));
  if (invalidos.length > 0) {
    removerArquivos(arquivos);
    throw new AppError(
      `O conteúdo de "${invalidos[0].originalname}" não é uma imagem válida.`,
      415,
    );
  }

  const imagens = await prisma.$transaction(
    arquivos.map((a) =>
      prisma.imagem.create({
        data: {
          veiculoId: veiculo.id,
          agendamentoId,
          enviadoPorId: usuario.id,
          nomeOriginal: a.originalname.slice(0, 255),
          nomeArquivo: a.filename,
          mimeType: a.mimetype,
          tamanhoBytes: a.size,
        },
      }),
    ),
  );

  res.status(201).json(imagens);
});

imagensRoutes.get('/veiculos/:id/imagens', async (req, res) => {
  const veiculo = await buscarVeiculoAutorizado(usuarioDa(req), lerId(req.params.id));
  const imagens = await prisma.imagem.findMany({
    where: { veiculoId: veiculo.id },
    include: { enviadoPor: { select: { nome: true, perfil: true } } },
    orderBy: { criadoEm: 'desc' },
  });
  res.json(imagens);
});

async function buscarImagemAutorizada(req: Parameters<typeof usuarioDa>[0]) {
  const usuario = usuarioDa(req);
  const imagem = await prisma.imagem.findUnique({
    where: { id: lerId(req.params.id) },
    include: { veiculo: { select: { clienteId: true } } },
  });
  if (!imagem || (usuario.perfil === 'CLIENTE' && imagem.veiculo.clienteId !== usuario.id)) {
    throw naoEncontrado('Imagem');
  }
  return imagem;
}

/**
 * O arquivo só é servido para quem tem acesso ao veículo
 * (as imagens não ficam em uma pasta pública).
 */
imagensRoutes.get('/imagens/:id/arquivo', async (req, res) => {
  const imagem = await buscarImagemAutorizada(req);
  const caminho = path.join(PASTA_UPLOADS, path.basename(imagem.nomeArquivo));
  if (!fs.existsSync(caminho)) throw naoEncontrado('Arquivo da imagem');
  res.type(imagem.mimeType).sendFile(caminho);
});

imagensRoutes.delete('/imagens/:id', async (req, res) => {
  const imagem = await buscarImagemAutorizada(req);
  await prisma.imagem.delete({ where: { id: imagem.id } });
  fs.rm(path.join(PASTA_UPLOADS, path.basename(imagem.nomeArquivo)), { force: true }, () => {});
  res.status(204).end();
});
