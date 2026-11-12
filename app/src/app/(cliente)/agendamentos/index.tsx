import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AgendamentoCard } from '../../../components/AgendamentoCard';
import { Botao, Chip, MensagemErro, Tela, Vazio } from '../../../components/ui';
import { api } from '../../../services/api';
import type { Agendamento, StatusAgendamento } from '../../../services/tipos';
import { useDados } from '../../../utils/useDados';

const FILTROS: { rotulo: string; status: StatusAgendamento[] }[] = [
  { rotulo: 'Em aberto', status: ['PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO'] },
  { rotulo: 'Histórico', status: ['CONCLUIDO', 'CANCELADO', 'RECUSADO'] },
];

export default function MeusAgendamentos() {
  const router = useRouter();
  const [filtro, setFiltro] = useState(0);
  const { dados, erro, carregando, recarregar } = useDados(
    () => api.get<Agendamento[]>(`/agendamentos?status=${FILTROS[filtro].status.join(',')}`),
    [filtro],
  );

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Botao
        titulo="Novo agendamento"
        icone="add-circle-outline"
        onPress={() => router.push('/agendamentos/novo')}
        estilo={{ marginBottom: 12 }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {FILTROS.map((f, i) => (
            <Chip key={f.rotulo} rotulo={f.rotulo} ativo={filtro === i} onPress={() => setFiltro(i)} />
          ))}
        </View>
      </ScrollView>
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && (
        <Vazio
          icone="calendar-outline"
          mensagem={filtro === 0 ? 'Nenhum agendamento em aberto.' : 'Nenhum atendimento no histórico.'}
        />
      )}
      {dados?.map((a) => (
        <AgendamentoCard key={a.id} agendamento={a} onPress={() => router.push(`/agendamentos/${a.id}`)} />
      ))}
    </Tela>
  );
}
