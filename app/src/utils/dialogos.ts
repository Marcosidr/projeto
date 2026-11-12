import { Alert, Platform } from 'react-native';

/** Alert.alert não funciona no navegador; estes atalhos tratam as duas plataformas. */
export function avisar(titulo: string, mensagem?: string) {
  if (Platform.OS === 'web') {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}

export function confirmar(titulo: string, mensagem: string, textoConfirmar = 'Confirmar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  }
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Voltar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoConfirmar, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
