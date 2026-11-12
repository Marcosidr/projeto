import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, criarUsuario, criarVeiculo, limparBanco } from './helpers';

const PASTA = path.resolve('uploads-test');

// PNG válido de 1x1 pixel
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

const arquivosNaPasta = () => (fs.existsSync(PASTA) ? fs.readdirSync(PASTA).length : 0);

beforeEach(async () => {
  await limparBanco();
  fs.rmSync(PASTA, { recursive: true, force: true });
  fs.mkdirSync(PASTA, { recursive: true });
});

afterAll(() => fs.rmSync(PASTA, { recursive: true, force: true }));

async function cenario() {
  const cliente = await criarUsuario('CLIENTE');
  const veiculo = await criarVeiculo(cliente.usuario.id);
  return { cliente, veiculo };
}

describe('Upload de imagens (RN09)', () => {
  it('aceita PNG e JPEG válidos e registra no banco', async () => {
    const { cliente, veiculo } = await cenario();
    const res = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', PNG, { filename: 'frente.png', contentType: 'image/png' })
      .attach('imagens', JPEG, { filename: 'lateral.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nomeArquivo).not.toContain('frente'); // nome gerado pelo servidor
    expect(arquivosNaPasta()).toBe(2);
  });

  it('recusa extensão não permitida', async () => {
    const { cliente, veiculo } = await cenario();
    const res = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', Buffer.from('texto'), { filename: 'notas.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
    expect(arquivosNaPasta()).toBe(0);
  });

  it('recusa quando a extensão não corresponde ao MIME', async () => {
    const { cliente, veiculo } = await cenario();
    const res = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', PNG, { filename: 'foto.gif', contentType: 'image/png' });
    expect(res.status).toBe(415);
  });

  it('recusa arquivo disfarçado de imagem (conteúdo não é PNG) e apaga o arquivo', async () => {
    const { cliente, veiculo } = await cenario();
    const res = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', Buffer.from('<script>alert(1)</script>'), { filename: 'foto.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    await new Promise((r) => setTimeout(r, 50));
    expect(arquivosNaPasta()).toBe(0);
  });

  it('recusa arquivo acima do tamanho máximo', async () => {
    const { cliente, veiculo } = await cenario();
    const grande = Buffer.concat([PNG, Buffer.alloc(1.5 * 1024 * 1024)]);
    const res = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', grande, { filename: 'grande.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
  });

  it('recusa mais de 5 arquivos por envio', async () => {
    const { cliente, veiculo } = await cenario();
    let req = api().post(`/veiculos/${veiculo.id}/imagens`).set('Authorization', cliente.auth);
    for (let i = 0; i < 6; i++) {
      req = req.attach('imagens', PNG, { filename: `f${i}.png`, contentType: 'image/png' });
    }
    expect((await req).status).toBe(400);
  });

  it('não permite enviar nem ver imagens do veículo de outro cliente', async () => {
    const { cliente, veiculo } = await cenario();
    const intruso = await criarUsuario('CLIENTE');

    const envio = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', intruso.auth)
      .attach('imagens', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(envio.status).toBe(404);

    const ok = await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', PNG, { filename: 'x.png', contentType: 'image/png' });
    const imagemId = ok.body[0].id;

    expect((await api().get(`/imagens/${imagemId}/arquivo`).set('Authorization', intruso.auth)).status).toBe(404);

    const arquivo = await api().get(`/imagens/${imagemId}/arquivo`).set('Authorization', cliente.auth);
    expect(arquivo.status).toBe(200);
    expect(arquivo.headers['content-type']).toContain('image/png');
  });

  it('administrador consulta as imagens recebidas', async () => {
    const { cliente, veiculo } = await cenario();
    const admin = await criarUsuario('ADMIN');
    await api()
      .post(`/veiculos/${veiculo.id}/imagens`)
      .set('Authorization', cliente.auth)
      .attach('imagens', PNG, { filename: 'x.png', contentType: 'image/png' });

    const res = await api().get(`/veiculos/${veiculo.id}/imagens`).set('Authorization', admin.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].enviadoPor.perfil).toBe('CLIENTE');
  });
});
