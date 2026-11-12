import 'dotenv/config';
import { z } from 'zod';

const horaSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:MM');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL não configurada'),
  PORT: z.coerce.number().int().positive().default(3333),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET deve ter pelo menos 10 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(5),
  OFICINA_ABERTURA: horaSchema.default('08:00'),
  OFICINA_FECHAMENTO: horaSchema.default('18:00'),
  OFICINA_FUSO: z
    .string()
    .regex(/^[+-]\d{2}:\d{2}$/, 'Use o formato -03:00')
    .default('-03:00'),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error('Variáveis de ambiente inválidas:');
  for (const issue of resultado.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Confira o arquivo .env (use o .env.example como modelo).');
  process.exit(1);
}

export const env = resultado.data;
