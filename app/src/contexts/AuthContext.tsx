import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, definirToken, quandoSessaoExpirar } from '../services/api';
import { apagarToken, lerToken, salvarToken } from '../services/armazenamento';
import type { Usuario } from '../services/tipos';

interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
}

interface AuthContextValor {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
  sair: () => Promise<void>;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(async () => {
    definirToken(null);
    await apagarToken();
    setUsuario(null);
  }, []);

  // Restaura a sessão salva ao abrir o app.
  useEffect(() => {
    quandoSessaoExpirar(() => void sair());
    (async () => {
      try {
        const token = await lerToken();
        if (token) {
          definirToken(token);
          setUsuario(await api.get<Usuario>('/auth/me'));
        }
      } catch {
        await sair();
      } finally {
        setCarregando(false);
      }
    })();
  }, [sair]);

  const iniciarSessao = useCallback(async (resposta: { usuario: Usuario; token: string }) => {
    definirToken(resposta.token);
    await salvarToken(resposta.token);
    setUsuario(resposta.usuario);
  }, []);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      await iniciarSessao(await api.post('/auth/login', { email, senha }));
    },
    [iniciarSessao],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      await iniciarSessao(await api.post('/auth/cadastro', dados));
    },
    [iniciarSessao],
  );

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, atualizarUsuario: setUsuario }),
    [usuario, carregando, entrar, cadastrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return contexto;
}
