import { execSync } from 'node:child_process';
import 'dotenv/config';

/**
 * Antes da suíte, recria o banco de testes aplicando todas as migrações.
 * O banco usado é o de DATABASE_URL_TEST — nunca o de desenvolvimento.
 */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('Configure DATABASE_URL_TEST no .env para rodar os testes.');
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL_TEST não pode ser igual a DATABASE_URL.');
  }
  if (process.env.SKIP_MIGRATE === '1') return;

  execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
