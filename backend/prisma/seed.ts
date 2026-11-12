import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const SERVICOS = [
  {
    nome: 'Troca de óleo e filtro',
    descricao: 'Substituição do óleo do motor e do filtro de óleo, com verificação de níveis.',
    preco: 180,
    duracaoMinutos: 60,
  },
  {
    nome: 'Alinhamento e balanceamento',
    descricao: 'Alinhamento da direção e balanceamento das quatro rodas.',
    preco: 120,
    duracaoMinutos: 60,
  },
  {
    nome: 'Troca de pastilhas de freio',
    descricao: 'Substituição das pastilhas dianteiras e inspeção de discos e fluido.',
    preco: 250,
    duracaoMinutos: 90,
  },
  {
    nome: 'Diagnóstico eletrônico',
    descricao: 'Leitura de falhas com scanner automotivo e relatório para o cliente.',
    preco: 100,
    duracaoMinutos: 30,
  },
  {
    nome: 'Higienização do ar-condicionado',
    descricao: 'Limpeza do sistema de ventilação e troca do filtro de cabine.',
    preco: 150,
    duracaoMinutos: 60,
  },
  {
    nome: 'Revisão completa',
    descricao: 'Checklist de 40 itens: motor, suspensão, freios, elétrica e fluidos.',
    preco: 480,
    duracaoMinutos: 180,
  },
];

async function main() {
  const emailAdmin = process.env.SEED_ADMIN_EMAIL ?? 'admin@oficina.com';
  const senhaAdmin = process.env.SEED_ADMIN_SENHA ?? 'admin123';

  await prisma.usuario.upsert({
    where: { email: emailAdmin },
    update: {},
    create: {
      nome: 'Administrador da Oficina',
      email: emailAdmin,
      senhaHash: await bcrypt.hash(senhaAdmin, 10),
      perfil: 'ADMIN',
    },
  });

  for (const nome of ['Box 1', 'Box 2', 'Box 3']) {
    await prisma.box.upsert({ where: { nome }, update: {}, create: { nome } });
  }

  for (const servico of SERVICOS) {
    await prisma.servico.upsert({ where: { nome: servico.nome }, update: {}, create: servico });
  }

  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@oficina.com' },
    update: {},
    create: {
      nome: 'Cliente Demonstração',
      email: 'cliente@oficina.com',
      telefone: '(44) 99999-0000',
      senhaHash: await bcrypt.hash('cliente123', 10),
    },
  });

  await prisma.veiculo.upsert({
    where: { placa: 'ABC1D23' },
    update: {},
    create: {
      clienteId: cliente.id,
      placa: 'ABC1D23',
      marca: 'Volkswagen',
      modelo: 'Gol 1.6',
      ano: 2019,
      cor: 'Prata',
      quilometragem: 68000,
    },
  });

  console.log('Seed concluído.');
  console.log(`  Admin:   ${emailAdmin} / ${senhaAdmin}`);
  console.log('  Cliente: cliente@oficina.com / cliente123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
