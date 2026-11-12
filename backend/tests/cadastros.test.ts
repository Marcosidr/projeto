import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, cenarioAgendamento, criarUsuario, diaUtil, horario, limparBanco } from './helpers';

beforeEach(limparBanco);

describe('Veículos (RN01)', () => {
  it('um cliente cadastra vários veículos e a placa é normalizada', async () => {
    const { auth } = await criarUsuario('CLIENTE');
    const a = await api().post('/veiculos').set('Authorization', auth).send({ placa: 'abc-1234', marca: 'Fiat', modelo: 'Palio', ano: 2012 });
    const b = await api().post('/veiculos').set('Authorization', auth).send({ placa: 'BRA2E19', marca: 'Honda', modelo: 'Civic', ano: 2022 });

    expect(a.status).toBe(201);
    expect(a.body.placa).toBe('ABC1234');
    expect(b.status).toBe(201);
    expect((await api().get('/veiculos').set('Authorization', auth)).body).toHaveLength(2);
  });

  it('recusa placa inválida e placa repetida', async () => {
    const { auth } = await criarUsuario('CLIENTE');
    const invalida = await api().post('/veiculos').set('Authorization', auth).send({ placa: '123', marca: 'Fiat', modelo: 'Uno', ano: 2010 });
    expect(invalida.status).toBe(400);

    await api().post('/veiculos').set('Authorization', auth).send({ placa: 'XYZ9A87', marca: 'Fiat', modelo: 'Uno', ano: 2010 });
    const repetida = await api().post('/veiculos').set('Authorization', auth).send({ placa: 'xyz9a87', marca: 'Ford', modelo: 'Ka', ano: 2014 });
    expect(repetida.status).toBe(409);
  });

  it('não exclui veículo que possui histórico', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(1);
    await api()
      .post('/agendamentos')
      .set('Authorization', cliente.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });

    const res = await api().delete(`/veiculos/${veiculo.id}`).set('Authorization', cliente.auth);
    expect(res.status).toBe(409);
  });
});

describe('Serviços', () => {
  it('a lista de serviços ativos é pública', async () => {
    await prisma.servico.create({ data: { nome: 'Ativo', descricao: 'Disponível', preco: 50, duracaoMinutos: 30 } });
    await prisma.servico.create({ data: { nome: 'Inativo', descricao: 'Fora de linha', preco: 50, duracaoMinutos: 30, ativo: false } });

    const res = await api().get('/servicos');
    expect(res.status).toBe(200);
    expect(res.body.map((s: { nome: string }) => s.nome)).toEqual(['Ativo']);
  });

  it('somente o administrador cadastra serviços', async () => {
    const cliente = await criarUsuario('CLIENTE');
    const admin = await criarUsuario('ADMIN');
    const dados = { nome: 'Troca de correia', descricao: 'Correia dentada e tensor', preco: 350, duracaoMinutos: 120 };

    expect((await api().post('/servicos').set('Authorization', cliente.auth).send(dados)).status).toBe(403);

    const res = await api().post('/servicos').set('Authorization', admin.auth).send(dados);
    expect(res.status).toBe(201);
    expect(Number(res.body.preco)).toBe(350);
  });

  it('valida a duração do serviço em múltiplos de 30 minutos', async () => {
    const admin = await criarUsuario('ADMIN');
    const res = await api()
      .post('/servicos')
      .set('Authorization', admin.auth)
      .send({ nome: 'Lavagem', descricao: 'Lavagem simples', preco: 40, duracaoMinutos: 45 });
    expect(res.status).toBe(400);
  });

  it('serviço com histórico é desativado em vez de excluído', async () => {
    const { admin, cliente, veiculo, servico } = await cenarioAgendamento(1);
    await api()
      .post('/agendamentos')
      .set('Authorization', cliente.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });

    const res = await api().delete(`/servicos/${servico.id}`).set('Authorization', admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.servico.ativo).toBe(false);
  });
});

describe('Gestão de clientes pelo administrador', () => {
  it('cria, edita, busca e exclui um cliente sem histórico', async () => {
    const admin = await criarUsuario('ADMIN');

    const criado = await api()
      .post('/usuarios')
      .set('Authorization', admin.auth)
      .send({ nome: 'Carlos Pereira', email: 'carlos@email.com', senha: 'segredo1', telefone: '(44) 98888-7777' });
    expect(criado.status).toBe(201);

    const editado = await api()
      .put(`/usuarios/${criado.body.id}`)
      .set('Authorization', admin.auth)
      .send({ nome: 'Carlos A. Pereira' });
    expect(editado.body.nome).toBe('Carlos A. Pereira');

    const busca = await api().get('/usuarios?busca=carlos').set('Authorization', admin.auth);
    expect(busca.body).toHaveLength(1);

    expect((await api().delete(`/usuarios/${criado.body.id}`).set('Authorization', admin.auth)).status).toBe(204);
  });

  it('não exclui cliente com agendamentos', async () => {
    const { admin, cliente, veiculo, servico } = await cenarioAgendamento(1);
    await api()
      .post('/agendamentos')
      .set('Authorization', cliente.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });

    const res = await api().delete(`/usuarios/${cliente.usuario.id}`).set('Authorization', admin.auth);
    expect(res.status).toBe(409);
  });
});
