import cors from 'cors';
import express from 'express';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros';
import { agendaRoutes } from './modules/agenda/agenda.routes';
import { agendamentosRoutes } from './modules/agendamentos/agendamentos.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { boxesRoutes } from './modules/boxes/boxes.routes';
import { imagensRoutes } from './modules/imagens/imagens.routes';
import { servicosRoutes } from './modules/servicos/servicos.routes';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes';
import { veiculosRoutes } from './modules/veiculos/veiculos.routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => {
  res.json({ nome: 'API Oficina Mecânica', versao: '1.0.0', status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/servicos', servicosRoutes);
app.use('/boxes', boxesRoutes);
app.use('/veiculos', veiculosRoutes);
app.use('/agendamentos', agendamentosRoutes);
app.use('/agenda', agendaRoutes);
app.use('/', imagensRoutes);

app.use(rotaNaoEncontrada);
app.use(tratarErros);
