import { beforeEach, describe, expect, it } from 'vitest';
import { api, cenarioAgendamento, criarUsuario, criarVeiculo, diaUtil, horario, limparBanco } from './helpers';

beforeEach(limparBanco);

describe('Permissões (RN06, RN07, RN08, RN10)', () => {
  it('cliente não acessa a gestão de usuários', async () => {
    const { auth } = await criarUsuario('CLIENTE');
    expect((await api().get('/usuarios').set('Authorization', auth)).status).toBe(403);
    expect((await api().get('/boxes').set('Authorization', auth)).status).toBe(403);
    expect((await api().get(`/agenda?data=${diaUtil()}`).set('Authorization', auth)).status).toBe(403);
  });

  it('administrador lista clientes', async () => {
    const { auth } = await criarUsuario('ADMIN');
    await criarUsuario('CLIENTE');
    const res = await api().get('/usuarios?perfil=CLIENTE').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].senhaHash).toBeUndefined();
  });

  it('cliente não vê veículo de outro cliente', async () => {
    const dono = await criarUsuario('CLIENTE');
    const intruso = await criarUsuario('CLIENTE');
    const veiculo = await criarVeiculo(dono.usuario.id);

    const res = await api().get(`/veiculos/${veiculo.id}`).set('Authorization', intruso.auth);
    expect(res.status).toBe(404);

    const lista = await api().get('/veiculos').set('Authorization', intruso.auth);
    expect(lista.body).toHaveLength(0);

    const editar = await api().put(`/veiculos/${veiculo.id}`).set('Authorization', intruso.auth).send({ cor: 'Rosa' });
    expect(editar.status).toBe(404);
  });

  it('cliente só vê os próprios agendamentos', async () => {
    const { cliente, veiculo, servico } = await cenarioAgendamento(2);
    const outro = await criarUsuario('CLIENTE');

    const criado = await api()
      .post('/agendamentos')
      .set('Authorization', cliente.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });
    expect(criado.status).toBe(201);

    expect((await api().get('/agendamentos').set('Authorization', outro.auth)).body).toHaveLength(0);
    expect((await api().get(`/agendamentos/${criado.body.id}`).set('Authorization', outro.auth)).status).toBe(404);
    expect((await api().patch(`/agendamentos/${criado.body.id}/cancelar`).set('Authorization', outro.auth)).status).toBe(404);
  });

  it('cliente não agenda usando veículo de outro cliente', async () => {
    const { veiculo, servico } = await cenarioAgendamento(1);
    const outro = await criarUsuario('CLIENTE');
    const res = await api()
      .post('/agendamentos')
      .set('Authorization', outro.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });
    expect(res.status).toBe(404);
  });

  it('somente o administrador confirma ou recusa', async () => {
    const { cliente, admin, veiculo, servico } = await cenarioAgendamento(1);
    const { body } = await api()
      .post('/agendamentos')
      .set('Authorization', cliente.auth)
      .send({ veiculoId: veiculo.id, servicoId: servico.id, inicio: horario(diaUtil(), '09:00') });

    expect((await api().patch(`/agendamentos/${body.id}/confirmar`).set('Authorization', cliente.auth)).status).toBe(403);
    expect(
      (await api().patch(`/agendamentos/${body.id}/recusar`).set('Authorization', cliente.auth).send({ motivo: 'teste' })).status,
    ).toBe(403);
    expect((await api().patch(`/agendamentos/${body.id}/confirmar`).set('Authorization', admin.auth)).status).toBe(200);
  });

  it('desativar uma conta invalida o acesso imediatamente', async () => {
    const admin = await criarUsuario('ADMIN');
    const cliente = await criarUsuario('CLIENTE');

    expect((await api().get('/auth/me').set('Authorization', cliente.auth)).status).toBe(200);

    const res = await api()
      .patch(`/usuarios/${cliente.usuario.id}/permissoes`)
      .set('Authorization', admin.auth)
      .send({ ativo: false });
    expect(res.status).toBe(200);

    expect((await api().get('/auth/me').set('Authorization', cliente.auth)).status).toBe(403);
  });

  it('promover um cliente a administrador libera as rotas de admin', async () => {
    const admin = await criarUsuario('ADMIN');
    const cliente = await criarUsuario('CLIENTE');

    await api()
      .patch(`/usuarios/${cliente.usuario.id}/permissoes`)
      .set('Authorization', admin.auth)
      .send({ perfil: 'ADMIN' });

    expect((await api().get('/usuarios').set('Authorization', cliente.auth)).status).toBe(200);
  });

  it('administrador não altera as próprias permissões', async () => {
    const admin = await criarUsuario('ADMIN');
    const res = await api()
      .patch(`/usuarios/${admin.usuario.id}/permissoes`)
      .set('Authorization', admin.auth)
      .send({ perfil: 'CLIENTE' });
    expect(res.status).toBe(422);
  });
});
