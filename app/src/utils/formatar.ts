import type { StatusAgendamento } from '../services/tipos';

const FUSO = 'America/Sao_Paulo';

export function moeda(valor: string | number) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

export function dataHora(iso: string) {
  return `${dataCurta(iso)} às ${hora(iso)}`;
}

export function duracao(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** "AAAA-MM-DD" de uma data, no fuso da oficina. */
export function paraDataISO(data: Date) {
  return data.toLocaleDateString('en-CA', { timeZone: FUSO });
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Próximos dias de funcionamento (segunda a sábado). */
export function proximosDiasUteis(quantidade: number) {
  const dias: { iso: string; diaSemana: string; dia: string }[] = [];
  const cursor = new Date();
  while (dias.length < quantidade) {
    const iso = paraDataISO(cursor);
    const meioDia = new Date(`${iso}T12:00:00-03:00`);
    const ds = meioDia.getUTCDay();
    if (ds !== 0) {
      dias.push({ iso, diaSemana: DIAS[ds], dia: `${iso.slice(8, 10)}/${iso.slice(5, 7)}` });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

export const STATUS_INFO: Record<StatusAgendamento, { rotulo: string; cor: string; fundo: string }> = {
  PENDENTE: { rotulo: 'Pendente', cor: '#92400E', fundo: '#FEF3C7' },
  CONFIRMADO: { rotulo: 'Confirmado', cor: '#1E40AF', fundo: '#DBEAFE' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', cor: '#6B21A8', fundo: '#F3E8FF' },
  CONCLUIDO: { rotulo: 'Concluído', cor: '#166534', fundo: '#DCFCE7' },
  RECUSADO: { rotulo: 'Recusado', cor: '#991B1B', fundo: '#FEE2E2' },
  CANCELADO: { rotulo: 'Cancelado', cor: '#374151', fundo: '#E5E7EB' },
};

export function placa(valor: string) {
  return valor.length === 7 ? `${valor.slice(0, 3)}-${valor.slice(3)}` : valor;
}
