import { useLocalSearchParams } from 'expo-router';
import { AgendamentoDetalhe } from '../../../components/AgendamentoDetalhe';
import { Tela } from '../../../components/ui';

export default function DetalheAgendamentoCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Tela>
      <AgendamentoDetalhe id={Number(id)} />
    </Tela>
  );
}
