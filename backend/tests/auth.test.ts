import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, criarUsuario, limparBanco } from './helpers';

beforeEach(limparBanco);

describe('Autenticação', () => {
  it('cadastra um cliente, retorna token e não expõe a senha', async () => {
    const res = await api()
      .post('/auth/cadastro')
      .send({ nome: 'Maria Souza', email: 'Maria@Email.com', senha: 'segredo1' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.usuario).toMatchObject({ email: 'maria@email.com', perfil: 'CLIENTE' });
    expect(res.body.usuario.senhaHash).toBeUndefined();

    const salvo = await prisma.usuario.findUniqueOrThrow({ where: { email: 'maria@email.com' } });
    expect(salvo.senhaHash).not.toBe('segredo1');
    expect(salvo.senhaHash.startsWith('$2')).toBe(true); // hash bcrypt
  });

  it('não permite se cadastrar como administrador', async () => {
    const res = await api()
      .post('/auth/cadastro')
      .send({ nome: 'Espertinho', email: 'x@x.com', senha: 'segredo1', perfil: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.usuario.perfil).toBe('CLIENTE');
  });

  it('recusa e-mail duplicado', async () => {
    const dados = { nome: 'João Lima', email: 'joao@email.com', senha: 'segredo1' };
    await api().post('/auth/cadastro').send(dados);
    const res = await api().post('/auth/cadastro').send(dados);
    expect(res.status).toBe(409);
  });

  it('valida os campos do cadastro', async () => {
    const res = await api().post('/auth/cadastro').send({ nome: 'A', email: 'invalido', senha: '1' });
    expect(res.status).toBe(400);
    const campos = res.body.detalhes.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['nome', 'email', 'senha']));
  });

  it('faz login com credenciais corretas e recusa senha errada', async () => {
    await api().post('/auth/cadastro').send({ nome: 'Ana Paula', email: 'ana@email.com', senha: 'segredo1' });

    const ok = await api().post('/auth/login').send({ email: 'ana@email.com', senha: 'segredo1' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTypeOf('string');

    const errado = await api().post('/auth/login').send({ email: 'ana@email.com', senha: 'outra' });
    expect(errado.status).toBe(401);
  });

  it('exige token nas rotas protegidas', async () => {
    expect((await api().get('/auth/me')).status).toBe(401);
    expect((await api().get('/auth/me').set('Authorization', 'Bearer token-falso')).status).toBe(401);
  });

  it('retorna o usuário autenticado em /auth/me', async () => {
    const { auth, usuario } = await criarUsuario('CLIENTE');
    const res = await api().get('/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(usuario.id);
  });

  it('bloqueia login de conta desativada', async () => {
    const { usuario } = await criarUsuario('CLIENTE');
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    const res = await api().post('/auth/login').send({ email: usuario.email, senha: 'senha123' });
    expect(res.status).toBe(403);
  });

  it('permite trocar a senha informando a senha atual', async () => {
    const { auth, usuario } = await criarUsuario('CLIENTE');

    const semAtual = await api().put('/auth/me').set('Authorization', auth).send({ novaSenha: 'nova123' });
    expect(semAtual.status).toBe(400);

    const ok = await api()
      .put('/auth/me')
      .set('Authorization', auth)
      .send({ senhaAtual: 'senha123', novaSenha: 'nova123' });
    expect(ok.status).toBe(200);

    const login = await api().post('/auth/login').send({ email: usuario.email, senha: 'nova123' });
    expect(login.status).toBe(200);
  });
});
