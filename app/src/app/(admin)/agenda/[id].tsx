import { useLocalSearchParams, useRouter } from 'expo-router';
import { AgendamentoDetalhe } from '../../../components/AgendamentoDetalhe';
import { Botao, Tela } from '../../../components/ui';
import { api } from '../../../services/api';
import type { Agendamento } from '../../../services/tipos';
import { useDados } from '../../../utils/useDados';

export default function DetalheAgendamentoAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dados } = useDados(() => api.get<Agendamento>(`/agendamentos/${id}`), [id]);

  return (
    <Tela>
      <AgendamentoDetalhe id={Number(id)} />
      {dados && (
        <Botao
          titulo="Ver ficha do cliente"
          icone="person-circle-outline"
          variante="texto"
          onPress={() => router.push(`/clientes/${dados.clienteId}`)}
        />
      )}
    </Tela>
  );
}
