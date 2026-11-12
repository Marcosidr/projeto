import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const PASTA_UPLOADS = path.resolve(env.UPLOAD_DIR);
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

export const MAX_ARQUIVOS = 5;

/** Tipos aceitos: MIME -> extensões permitidas. */
const TIPOS_PERMITIDOS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_UPLOADS),
  filename: (_req, file, cb) => {
    const extensao = TIPOS_PERMITIDOS[file.mimetype][0];
    cb(null, `${randomUUID()}${extensao}`);
  },
});

/**
 * 1ª e 2ª validação: extensão e MIME declarados precisam ser permitidos
 * e corresponder entre si.
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const extensao = path.extname(file.originalname).toLowerCase();
  const extensoesDoTipo = TIPOS_PERMITIDOS[file.mimetype];

  if (!extensoesDoTipo) {
    return cb(new AppError(`Tipo de arquivo não permitido: ${file.mimetype}. Envie JPG, PNG ou WEBP.`, 415));
  }
  if (!extensoesDoTipo.includes(extensao)) {
    return cb(new AppError(`A extensão "${extensao || '(nenhuma)'}" não corresponde ao tipo ${file.mimetype}.`, 415));
  }
  cb(null, true);
};

export const uploadImagens = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_MB * 1024 * 1024,
    files: MAX_ARQUIVOS,
  },
}).array('imagens', MAX_ARQUIVOS);

/**
 * 3ª validação: confere a assinatura binária (magic bytes) do arquivo,
 * impedindo que um arquivo qualquer seja renomeado para .png, por exemplo.
 */
export function conteudoEhImagemValida(caminho: string, mimetype: string): boolean {
  const fd = fs.openSync(caminho, 'r');
  const cabecalho = Buffer.alloc(12);
  fs.readSync(fd, cabecalho, 0, 12, 0);
  fs.closeSync(fd);

  switch (mimetype) {
    case 'image/jpeg':
      return cabecalho[0] === 0xff && cabecalho[1] === 0xd8 && cabecalho[2] === 0xff;
    case 'image/png':
      return cabecalho.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return (
        cabecalho.subarray(0, 4).toString('ascii') === 'RIFF' &&
        cabecalho.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
}

export function removerArquivos(arquivos: { path: string }[]) {
  for (const arquivo of arquivos) {
    fs.rm(arquivo.path, { force: true }, () => {});
  }
}
