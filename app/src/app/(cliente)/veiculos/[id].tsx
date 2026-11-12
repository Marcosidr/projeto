import { useLocalSearchParams } from 'expo-router';
import { Tela } from '../../../components/ui';
import { VeiculoDetalhe } from '../../../components/VeiculoDetalhe';

export default function DetalheVeiculoCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Tela>
      <VeiculoDetalhe
        id={Number(id)}
        rotaAgendamento={(agendamentoId) => `/agendamentos/${agendamentoId}`}
        rotaEditar={(veiculoId) => `/veiculos/form?id=${veiculoId}`}
      />
    </Tela>
  );
}
