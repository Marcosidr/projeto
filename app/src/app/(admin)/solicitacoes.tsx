import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AgendamentoCard } from '../../components/AgendamentoCard';
import { Botao, MensagemErro, Tela, TextoSuave, Vazio } from '../../components/ui';
import { api, mensagemDeErro } from '../../services/api';
import type { Agendamento } from '../../services/tipos';
import { espaco } from '../../theme';
import { avisar } from '../../utils/dialogos';
import { useDados } from '../../utils/useDados';

/** Fila de solicitações pendentes, da mais próxima para a mais distante. */
export default function Solicitacoes() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const lista = await api.get<Agendamento[]>('/agendamentos?status=PENDENTE');
    return lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
  });

  async function confirmarRapido(id: number) {
    setConfirmando(id);
    try {
      await api.patch(`/agendamentos/${id}/confirmar`);
      await recarregar();
    } catch (e) {
      avisar('Erro', mensagemDeErro(e));
    } finally {
      setConfirmando(null);
    }
  }

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <TextoSuave>Confirme ou recuse os pedidos. Para recusar, abra o pedido e informe o motivo.</TextoSuave>
      <View style={{ height: espaco.md }} />
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && <Vazio icone="checkmark-done-outline" mensagem="Nenhuma solicitação pendente." />}
      {dados?.map((a) => (
        <View key={a.id}>
          <AgendamentoCard agendamento={a} mostrarCliente onPress={() => router.push(`/agenda/${a.id}`)} />
          <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: -6, marginBottom: espaco.lg }}>
            <Botao
              titulo="Confirmar"
              icone="checkmark"
              estilo={{ flex: 1 }}
              carregando={confirmando === a.id}
              onPress={() => confirmarRapido(a.id)}
            />
            <Botao
              titulo="Analisar"
              variante="secundario"
              estilo={{ flex: 1 }}
              onPress={() => router.push(`/agenda/${a.id}`)}
            />
          </View>
        </View>
      ))}
    </Tela>
  );
}
