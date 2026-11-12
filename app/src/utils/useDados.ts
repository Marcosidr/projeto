import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type DependencyList } from 'react';
import { mensagemDeErro } from '../services/api';

/**
 * Carrega dados da API sempre que a tela ganha foco
 * (assim as listas se atualizam ao voltar de um formulário).
 */
export function useDados<T>(carregar: () => Promise<T>, deps: DependencyList = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregarMemo = useCallback(carregar, deps);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDados(await carregarMemo());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [carregarMemo]);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  return { dados, erro, carregando, recarregar, setDados };
}
