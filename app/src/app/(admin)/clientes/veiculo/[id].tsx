import { useLocalSearchParams } from 'expo-router';
import { Tela } from '../../../../components/ui';
import { VeiculoDetalhe } from '../../../../components/VeiculoDetalhe';

export default function VeiculoDoCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Tela>
      <VeiculoDetalhe
        id={Number(id)}
        rotaAgendamento={(agendamentoId) => `/agenda/${agendamentoId}`}
        rotaEditar={(veiculoId) => `/clientes/veiculo-form?id=${veiculoId}`}
      />
    </Tela>
  );
}
