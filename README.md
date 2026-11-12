# Oficina Agenda — Sistema de Agendamento de Oficina Mecânica

Aplicativo para clientes agendarem serviços em uma oficina mecânica e painel para a oficina controlar horários, clientes, veículos, serviços e atendimentos.

- **app/**: aplicativo React Native + Expo (TypeScript, Expo Router)
- **backend/**: API Node.js + Express + Prisma + PostgreSQL (JWT, bcrypt, Multer)
- **docs/**: documentação acadêmica completa, com diagramas em Mermaid

## Requisitos

- Node.js 20 ou superior
- Docker Desktop (para o PostgreSQL), ou um PostgreSQL 14+ instalado
- App **Expo Go** no celular (Android ou iOS) para testar no aparelho

## 1. Banco de dados (Docker)

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe o PostgreSQL na porta **5434**, com os bancos `oficina` e `oficina_test`.

## 2. API (backend)

```bash
cd backend
copy .env.example .env      # no Linux/macOS: cp .env.example .env
npm install
npx prisma migrate deploy   # cria as tabelas
npm run db:seed             # dados iniciais (admin, boxes, serviços, cliente demo)
npm run dev                 # API em http://localhost:3333
```

> No PowerShell, se aparecer "a execução de scripts foi desabilitada", use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx`, ou rode os comandos no Prompt de Comando (cmd).

Usuários criados pelo seed:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | admin@oficina.com | admin123 |
| Cliente | cliente@oficina.com | cliente123 |

Testes automatizados (usam o banco `oficina_test`, que é apagado e recriado):

```bash
npm test
```

## 3. Aplicativo

Com a API rodando, abra outro terminal:

```bash
cd app
npx expo start
```

Leia o QR code com o **Expo Go**. O celular precisa estar **na mesma rede Wi-Fi** do computador. O app descobre sozinho o IP do computador. Se não conectar:

1. libere a porta **3333** no Firewall do Windows (rede privada);
2. ou crie `app/.env` com `EXPO_PUBLIC_API_URL=http://SEU_IP:3333` (veja o IP com `ipconfig`).

Para abrir no navegador: tecle `w` no terminal do Expo.

## 4. Publicar no GitHub

```bash
git init
git add .
git commit -m "Primeira versão do sistema de agendamento"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/oficina-agenda.git
git push -u origin main
```

O `.gitignore` já impede o envio de `node_modules`, `.env` e das imagens enviadas.

## Funcionalidades

| Cliente | Administrador |
| --- | --- |
| Criar conta e entrar | Agenda do dia por box |
| Cadastrar vários veículos | Confirmar ou recusar solicitações |
| Ver serviços, preços e duração | Iniciar e concluir atendimentos |
| Agendar escolhendo só horários livres | CRUD de clientes e veículos |
| Enviar fotos do veículo | Cadastrar serviços e preços |
| Acompanhar status e cancelar | Ver as fotos recebidas |
| Histórico de cada veículo | Gerenciar usuários e permissões |

A documentação do projeto (requisitos, regras de negócio, DER, diagramas UML, evolução e evidências de teste) está em [`docs/Documentacao-Oficina-Agenda.pdf`](docs/Documentacao-Oficina-Agenda.pdf).
