import 'dotenv/config';

// Redireciona a aplicação para o banco e a pasta de uploads de teste.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.UPLOAD_DIR = 'uploads-test';
process.env.UPLOAD_MAX_MB = '1';
process.env.OFICINA_ABERTURA = '08:00';
process.env.OFICINA_FECHAMENTO = '18:00';
process.env.OFICINA_FUSO = '-03:00';
