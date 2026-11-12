import { Text, View } from 'react-native';
import type { Agendamento } from '../services/tipos';
import { dataHora, placa } from '../utils/formatar';
import { Cartao, Linha, StatusBadge, Subtitulo, estilos } from './ui';

export function AgendamentoCard({
  agendamento,
  mostrarCliente = false,
  onPress,
}: {
  agendamento: Agendamento;
  mostrarCliente?: boolean;
  onPress?: () => void;
}) {
  const { servico, veiculo, cliente, box } = agendamento;
  return (
    <Cartao onPress={onPress}>
      <View style={[estilos.linhaCentro, { justifyContent: 'space-between', marginBottom: 6 }]}>
        <Subtitulo>{servico.nome}</Subtitulo>
        <StatusBadge status={agendamento.status} />
      </View>
      <Linha icone="calendar-outline">{dataHora(agendamento.inicio)}</Linha>
      <Linha icone="car-outline">
        {veiculo.marca} {veiculo.modelo} · {placa(veiculo.placa)}
      </Linha>
      {mostrarCliente && <Linha icone="person-outline">{cliente.nome}</Linha>}
      <Linha icone="construct-outline">{box.nome}</Linha>
      {agendamento.motivoRecusa && (
        <Text style={[estilos.textoSuave, { marginTop: 6, fontStyle: 'italic' }]}>
          Motivo: {agendamento.motivoRecusa}
        </Text>
      )}
    </Cartao>
  );
}
