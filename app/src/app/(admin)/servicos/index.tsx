import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Botao, Cartao, Linha, MensagemErro, Subtitulo, Tela, TextoSuave, Vazio, estilos } from '../../../components/ui';
import { api } from '../../../services/api';
import type { Servico } from '../../../services/tipos';
import { cores } from '../../../theme';
import { duracao, moeda } from '../../../utils/formatar';
import { useDados } from '../../../utils/useDados';

export default function ServicosAdmin() {
  const router = useRouter();
  const { dados, erro, carregando, recarregar } = useDados(() => api.get<Servico[]>('/servicos?todos=true'));

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Botao
        titulo="Novo serviço"
        icone="add-circle-outline"
        onPress={() => router.push('/servicos/form')}
        estilo={{ marginBottom: 16 }}
      />
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && <Vazio icone="construct-outline" mensagem="Nenhum serviço cadastrado." />}
      {dados?.map((s) => (
        <Cartao
          key={s.id}
          onPress={() => router.push({ pathname: '/servicos/form', params: { id: s.id } })}
          estilo={!s.ativo && { opacity: 0.55 }}
        >
          <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
            <Subtitulo>{s.nome}</Subtitulo>
            <Text style={{ fontWeight: '700', color: cores.primaria }}>{moeda(s.preco)}</Text>
          </View>
          <TextoSuave>{s.descricao}</TextoSuave>
          <Linha icone="time-outline">
            {duracao(s.duracaoMinutos)}
            {!s.ativo ? ' · INATIVO' : ''}
          </Linha>
        </Cartao>
      ))}
    </Tela>
  );
}
