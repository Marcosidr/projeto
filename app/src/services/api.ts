import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Endereço da API:
 * 1. EXPO_PUBLIC_API_URL, se definido no .env do app;
 * 2. no celular com Expo Go, o mesmo IP do computador que roda o Expo;
 * 3. localhost (web) ou 10.0.2.2 (emulador Android).
 */
function descobrirUrlDaApi() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return 'http://localhost:3333';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3333`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333';
}

export const API_URL = descobrirUrlDaApi();

let token: string | null = null;
let aoExpirarSessao: (() => void) | null = null;

export function definirToken(novo: string | null) {
  token = novo;
}

export function obterToken() {
  return token;
}

export function quandoSessaoExpirar(callback: () => void) {
  aoExpirarSessao = callback;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Detalhe = { campo: string; mensagem: string };

async function requisicao<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (corpo instanceof FormData) {
    body = corpo;
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { method: metodo, headers, body });
  } catch {
    throw new ApiError(`Não foi possível conectar ao servidor (${API_URL}).`, 0);
  }

  if (resposta.status === 204) return undefined as T;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status === 401 && token) aoExpirarSessao?.();
    let mensagem: string = dados?.erro ?? `Erro ${resposta.status}`;
    if (Array.isArray(dados?.detalhes) && dados.detalhes.length > 0) {
      mensagem += '\n' + (dados.detalhes as Detalhe[]).map((d) => `• ${d.mensagem}`).join('\n');
    }
    throw new ApiError(mensagem, resposta.status);
  }

  return dados as T;
}

export const api = {
  get: <T>(caminho: string) => requisicao<T>('GET', caminho),
  post: <T>(caminho: string, corpo?: unknown) => requisicao<T>('POST', caminho, corpo),
  put: <T>(caminho: string, corpo?: unknown) => requisicao<T>('PUT', caminho, corpo),
  patch: <T>(caminho: string, corpo?: unknown) => requisicao<T>('PATCH', caminho, corpo ?? {}),
  delete: <T = void>(caminho: string) => requisicao<T>('DELETE', caminho),
};

export function mensagemDeErro(erro: unknown) {
  return erro instanceof Error ? erro.message : 'Ocorreu um erro inesperado.';
}
