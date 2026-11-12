import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import type { Perfil } from '../src/generated/prisma/enums';

export const api = () => request(app);

export async function limparBanco() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE historico_status, imagens, agendamentos, veiculos, servicos, boxes, usuarios RESTART IDENTITY CASCADE',
  );
}

let contador = 0;

export async function criarUsuario(perfil: Perfil = 'CLIENTE', ativo = true) {
  contador += 1;
  const senha = 'senha123';
  const usuario = await prisma.usuario.create({
    data: {
      nome: `${perfil === 'ADMIN' ? 'Admin' : 'Cliente'} Teste ${contador}`,
      email: `${perfil.toLowerCase()}${contador}@teste.com`,
      senhaHash: await bcrypt.hash(senha, 4),
      perfil,
      ativo,
    },
  });
  const resposta = await api().post('/auth/login').send({ email: usuario.email, senha });
  return { usuario, token: resposta.body.token as string, auth: `Bearer ${resposta.body.token}` };
}

export async function criarBoxes(quantidade: number) {
  for (let i = 1; i <= quantidade; i++) {
    await prisma.box.create({ data: { nome: `Box ${i}` } });
  }
}

export async function criarServico(duracaoMinutos = 60) {
  contador += 1;
  return prisma.servico.create({
    data: { nome: `Serviço ${contador}`, descricao: 'Serviço de teste', preco: 100, duracaoMinutos },
  });
}

export async function criarVeiculo(clienteId: number) {
  contador += 1;
  const placa = `TST${contador % 10}A${String(contador).padStart(2, '0').slice(-2)}`;
  return prisma.veiculo.create({
    data: { clienteId, placa, marca: 'Fiat', modelo: 'Uno', ano: 2015 },
  });
}

/** Próxima data (AAAA-MM-DD) com pelo menos 2 dias de antecedência que caia no dia da semana pedido. */
export function proximoDia(diaSemana: number) {
  const d = new Date(Date.now() + 2 * 86_400_000);
  while (d.getUTCDay() !== diaSemana) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Uma terça-feira futura, usada como dia útil padrão. */
export const diaUtil = () => proximoDia(2);

export const horario = (data: string, hhmm: string) => `${data}T${hhmm}:00-03:00`;

/** Cenário comum: cliente com veículo, serviço de 60 min e N boxes. */
export async function cenarioAgendamento(boxes = 1) {
  await criarBoxes(boxes);
  const admin = await criarUsuario('ADMIN');
  const cliente = await criarUsuario('CLIENTE');
  const veiculo = await criarVeiculo(cliente.usuario.id);
  const servico = await criarServico(60);
  return { admin, cliente, veiculo, servico };
}
