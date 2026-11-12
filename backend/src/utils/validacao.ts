import { z } from 'zod';

z.config(z.locales.pt());

export const idSchema = z.coerce.number().int().positive();

export function lerId(valor: unknown): number {
  return idSchema.parse(valor);
}

export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const senhaSchema = z
  .string()
  .min(6, 'A senha deve ter pelo menos 6 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres');

export const emailSchema = z
  .email('E-mail inválido')
  .max(160)
  .transform((e) => e.trim().toLowerCase());

export const telefoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9()+\-\s]{8,20}$/, 'Telefone inválido');
