import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE_TOKEN = 'oficina.token';

/**
 * No celular o token fica no armazenamento seguro do sistema.
 * Na versão web (apenas para desenvolvimento) usa o localStorage.
 */
export async function lerToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function salvarToken(token: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(CHAVE_TOKEN, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function apagarToken() {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}
