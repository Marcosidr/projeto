import { env } from '../config/env';
import { AppError } from './AppError';

/** Intervalo entre horários oferecidos na agenda (minutos). */
export const INTERVALO_SLOT_MIN = 30;

/** Dias em que a oficina funciona (0 = domingo ... 6 = sábado). */
export const DIAS_FUNCIONAMENTO = [1, 2, 3, 4, 5, 6];

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function offsetMinutos(): number {
  const sinal = env.OFICINA_FUSO.startsWith('-') ? -1 : 1;
  const [h, m] = env.OFICINA_FUSO.slice(1).split(':').map(Number);
  return sinal * (h * 60 + m);
}

export const ABERTURA_MIN = () => paraMinutos(env.OFICINA_ABERTURA);
export const FECHAMENTO_MIN = () => paraMinutos(env.OFICINA_FECHAMENTO);

/** Converte uma data (UTC) para a data/hora local da oficina. */
export function paraHoraLocal(data: Date) {
  const local = new Date(data.getTime() + offsetMinutos() * 60_000);
  return {
    data: local.toISOString().slice(0, 10),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
    diaSemana: local.getUTCDay(),
  };
}

/** Monta um Date a partir de "AAAA-MM-DD" e minutos desde 00:00 no horário local. */
export function dataLocal(data: string, minutos: number): Date {
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mm = String(minutos % 60).padStart(2, '0');
  return new Date(`${data}T${hh}:${mm}:00${env.OFICINA_FUSO}`);
}

export function formatarHora(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Início e fim (exclusivo) de um dia local, em UTC. */
export function limitesDoDia(data: string) {
  const inicio = dataLocal(data, 0);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60_000);
  return { inicio, fim };
}

export function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60_000);
}

/**
 * Valida se o intervalo cabe no horário de funcionamento:
 * dia útil, dentro do expediente, alinhado aos slots e no futuro.
 */
export function validarHorarioFuncionamento(inicio: Date, fim: Date, agora = new Date()) {
  if (inicio.getTime() <= agora.getTime()) {
    throw new AppError('Escolha uma data e horário futuros.', 422);
  }

  const ini = paraHoraLocal(inicio);
  const fi = paraHoraLocal(fim);

  if (!DIAS_FUNCIONAMENTO.includes(ini.diaSemana)) {
    throw new AppError('A oficina não funciona aos domingos.', 422);
  }

  if (ini.minutos % INTERVALO_SLOT_MIN !== 0) {
    throw new AppError(
      `Os horários devem começar em intervalos de ${INTERVALO_SLOT_MIN} minutos.`,
      422,
    );
  }

  const foraDoExpediente =
    ini.minutos < ABERTURA_MIN() ||
    fi.data !== ini.data ||
    fi.minutos > FECHAMENTO_MIN();

  if (foraDoExpediente) {
    throw new AppError(
      `O serviço precisa começar e terminar dentro do expediente (${env.OFICINA_ABERTURA} às ${env.OFICINA_FECHAMENTO}).`,
      422,
    );
  }
}

/** Lista os horários de início possíveis em um dia para uma duração. */
export function gerarSlots(data: string, duracaoMin: number): Date[] {
  const { diaSemana } = paraHoraLocal(dataLocal(data, 12 * 60));
  if (!DIAS_FUNCIONAMENTO.includes(diaSemana)) return [];

  const slots: Date[] = [];
  for (
    let m = ABERTURA_MIN();
    m + duracaoMin <= FECHAMENTO_MIN();
    m += INTERVALO_SLOT_MIN
  ) {
    slots.push(dataLocal(data, m));
  }
  return slots;
}

export function haSobreposicao(aIni: Date, aFim: Date, bIni: Date, bFim: Date) {
  return aIni < bFim && aFim > bIni;
}
