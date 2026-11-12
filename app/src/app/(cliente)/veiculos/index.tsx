import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Botao, Cartao, Linha, MensagemErro, Subtitulo, Tela, Vazio, estilos } from '../../../components/ui';
import { api } from '../../../services/api';
import type { Veiculo } from '../../../services/tipos';
import { cores } from '../../../theme';
import { placa } from '../../../utils/formatar';
import { useDados } from '../../../utils/useDados';

export default function MeusVeiculos() {
  const router = useRouter();
  const { dados, erro, carregando, recarregar } = useDados(() => api.get<Veiculo[]>('/veiculos'));

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Botao
        titulo="Cadastrar veículo"
        icone="add-circle-outline"
        onPress={() => router.push('/veiculos/form')}
        estilo={{ marginBottom: 16 }}
      />
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && (
        <Vazio icone="car-outline" mensagem="Você ainda não cadastrou veículos. Cadastre um para poder agendar." />
      )}
      {dados?.map((v) => (
        <Cartao key={v.id} onPress={() => router.push(`/veiculos/${v.id}`)}>
          <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
            <Subtitulo>
              {v.marca} {v.modelo}
            </Subtitulo>
            <Text style={{ fontWeight: '700', letterSpacing: 1, color: cores.primaria }}>{placa(v.placa)}</Text>
          </View>
          <Linha icone="calendar-outline">
            {v.ano}
            {v.cor ? ` · ${v.cor}` : ''}
          </Linha>
          <Linha icone="document-text-outline">
            {v._count?.agendamentos ?? 0} atendimento(s) · {v._count?.imagens ?? 0} foto(s)
          </Linha>
        </Cartao>
      ))}
    </Tela>
  );
}
