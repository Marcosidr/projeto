import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Botao, Cartao, Chip, MensagemErro, Subtitulo, Tela, TextoSuave, Vazio, estilos } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { api, mensagemDeErro } from '../../services/api';
import type { Usuario } from '../../services/tipos';
import { cores, espaco } from '../../theme';
import { avisar, confirmar } from '../../utils/dialogos';
import { useDados } from '../../utils/useDados';

const FILTROS = [
  { rotulo: 'Todos', query: '' },
  { rotulo: 'Administradores', query: 'perfil=ADMIN' },
  { rotulo: 'Clientes', query: 'perfil=CLIENTE' },
  { rotulo: 'Inativos', query: 'ativo=false' },
];

/** Gerenciamento de usuários e permissões. */
export default function Usuarios() {
  const router = useRouter();
  const { usuario: eu } = useAuth();
  const [filtro, setFiltro] = useState(0);
  const { dados, erro, carregando, recarregar } = useDados(
    () => api.get<Usuario[]>(`/usuarios?${FILTROS[filtro].query}`),
    [filtro],
  );

  async function alterarPermissoes(u: Usuario, mudanca: { perfil?: Usuario['perfil']; ativo?: boolean }) {
    const descricao =
      mudanca.perfil !== undefined
        ? mudanca.perfil === 'ADMIN'
          ? `Tornar ${u.nome} administrador(a)?`
          : `Remover o acesso de administrador de ${u.nome}?`
        : mudanca.ativo
          ? `Reativar a conta de ${u.nome}?`
          : `Desativar a conta de ${u.nome}? A pessoa não conseguirá mais entrar.`;
    if (!(await confirmar('Alterar permissões', descricao))) return;
    try {
      await api.patch(`/usuarios/${u.id}/permissoes`, mudanca);
      await recarregar();
    } catch (e) {
      avisar('Erro', mensagemDeErro(e));
    }
  }

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {FILTROS.map((f, i) => (
            <Chip key={f.rotulo} rotulo={f.rotulo} ativo={filtro === i} onPress={() => setFiltro(i)} />
          ))}
        </View>
      </ScrollView>
      <Botao
        titulo="Novo administrador"
        icone="shield-outline"
        variante="secundario"
        onPress={() => router.push({ pathname: '/clientes/form', params: { perfil: 'ADMIN' } })}
        estilo={{ marginVertical: espaco.md }}
      />
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && <Vazio icone="people-outline" mensagem="Nenhum usuário neste filtro." />}
      {dados?.map((u) => {
        const souEu = u.id === eu?.id;
        return (
          <Cartao key={u.id}>
            <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
              <Subtitulo>{u.nome}</Subtitulo>
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 12,
                  color: u.perfil === 'ADMIN' ? cores.destaque : cores.textoSuave,
                }}
              >
                {u.perfil === 'ADMIN' ? 'ADMINISTRADOR' : 'CLIENTE'}
              </Text>
            </View>
            <TextoSuave>{u.email}</TextoSuave>
            {!u.ativo && <Text style={{ color: cores.perigo, fontWeight: '600', marginTop: 4 }}>Conta desativada</Text>}
            {souEu ? (
              <TextoSuave>(você)</TextoSuave>
            ) : (
              <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md }}>
                <Botao
                  titulo={u.perfil === 'ADMIN' ? 'Tornar cliente' : 'Tornar admin'}
                  variante="secundario"
                  estilo={{ flex: 1 }}
                  onPress={() => alterarPermissoes(u, { perfil: u.perfil === 'ADMIN' ? 'CLIENTE' : 'ADMIN' })}
                />
                <Botao
                  titulo={u.ativo ? 'Desativar' : 'Reativar'}
                  variante={u.ativo ? 'texto' : 'secundario'}
                  estilo={{ flex: 1 }}
                  onPress={() => alterarPermissoes(u, { ativo: !u.ativo })}
                />
              </View>
            )}
          </Cartao>
        );
      })}
    </Tela>
  );
}
