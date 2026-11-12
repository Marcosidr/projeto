export type Perfil = 'CLIENTE' | 'ADMIN';

export type StatusAgendamento =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'RECUSADO'
  | 'CANCELADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  _count?: { veiculos: number; agendamentos: number };
}

export interface Servico {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  duracaoMinutos: number;
  ativo: boolean;
}

export interface Veiculo {
  id: number;
  clienteId: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string | null;
  quilometragem: number | null;
  cliente?: { id: number; nome: string; email?: string; telefone?: string | null };
  imagens?: Imagem[];
  _count?: { agendamentos: number; imagens: number };
}

export interface Imagem {
  id: number;
  veiculoId: number;
  agendamentoId: number | null;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  criadoEm: string;
  enviadoPor?: { nome: string; perfil: Perfil };
}

export interface HistoricoStatus {
  id: number;
  statusAnterior: StatusAgendamento | null;
  statusNovo: StatusAgendamento;
  observacao: string | null;
  criadoEm: string;
  usuario: { nome: string; perfil: Perfil };
}

export interface Agendamento {
  id: number;
  clienteId: number;
  veiculoId: number;
  servicoId: number;
  boxId: number;
  inicio: string;
  fim: string;
  status: StatusAgendamento;
  observacoes: string | null;
  motivoRecusa: string | null;
  precoCobrado: string;
  cliente: { id: number; nome: string; email: string; telefone: string | null };
  veiculo: { id: number; placa: string; marca: string; modelo: string; ano: number; cor: string | null };
  servico: { id: number; nome: string; duracaoMinutos: number; descricao?: string };
  box: { id: number; nome: string };
  historico?: HistoricoStatus[];
  imagens?: Imagem[];
}

export interface HorarioDisponivel {
  inicio: string;
  horario: string;
  boxesLivres: number;
  disponivel: boolean;
}

export interface Disponibilidade {
  data: string;
  servico: { id: number; nome: string; duracaoMinutos: number };
  horarios: HorarioDisponivel[];
}

export interface Box {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface AgendaDoDia {
  data: string;
  expediente: { abertura: string; fechamento: string; intervaloMinutos: number };
  resumo: Partial<Record<StatusAgendamento, number>>;
  boxes: (Box & { agendamentos: Agendamento[] })[];
}
