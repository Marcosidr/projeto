import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cartao, MensagemErro, StatusBadge, Tela, TextoSuave, estilos as ui } from '../../../components/ui';
import { api } from '../../../services/api';
import type { AgendaDoDia, StatusAgendamento } from '../../../services/tipos';
import { cores, espaco, raio } from '../../../theme';
import { STATUS_INFO, hora, paraDataISO, placa } from '../../../utils/formatar';
import { useDados } from '../../../utils/useDados';

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function deslocar(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraDataISO(d);
}

function descricaoDoDia(data: string) {
  const d = new Date(`${data}T12:00:00-03:00`);
  return `${DIAS[d.getUTCDay()]}, ${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/** Agenda diária organizada por box (visualização por dia e horário). */
export default function Agenda() {
  const router = useRouter();
  const [data, setData] = useState(() => paraDataISO(new Date()));
  const [todos, setTodos] = useState(false);

  const { dados, erro, carregando, recarregar } = useDados(
    () => api.get<AgendaDoDia>(`/agenda?data=${data}&todos=${todos}`),
    [data, todos],
  );

  const resumo = Object.entries(dados?.resumo ?? {}) as [StatusAgendamento, number][];

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <View style={estilos.navegacao}>
        <Pressable onPress={() => setData((d) => deslocar(d, -1))} hitSlop={10} accessibilityLabel="Dia anterior">
          <Ionicons name="chevron-back" size={26} color={cores.primaria} />
        </Pressable>
        <Pressable onPress={() => setData(paraDataISO(new Date()))}>
          <Text style={estilos.dia}>{descricaoDoDia(data)}</Text>
          <Text style={[ui.textoSuave, { textAlign: 'center', fontSize: 12 }]}>toque para voltar a hoje</Text>
        </Pressable>
        <Pressable onPress={() => setData((d) => deslocar(d, 1))} hitSlop={10} accessibilityLabel="Próximo dia">
          <Ionicons name="chevron-forward" size={26} color={cores.primaria} />
        </Pressable>
      </View>

      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}

      {dados && (
        <>
          <TextoSuave>
            Expediente: {dados.expediente.abertura} às {dados.expediente.fechamento}
          </TextoSuave>
          <View style={estilos.resumo}>
            {resumo.length === 0 && <TextoSuave>Nenhum agendamento neste dia.</TextoSuave>}
            {resumo.map(([status, total]) => (
              <View key={status} style={[estilos.resumoItem, { backgroundColor: STATUS_INFO[status].fundo }]}>
                <Text style={{ color: STATUS_INFO[status].cor, fontWeight: '700' }}>
                  {total} {STATUS_INFO[status].rotulo.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => setTodos((t) => !t)} style={[ui.linhaCentro, { marginBottom: espaco.md }]}>
            <Ionicons name={todos ? 'checkbox' : 'square-outline'} size={20} color={cores.primaria} />
            <Text style={{ marginLeft: 6 }}>Mostrar também cancelados, recusados e concluídos</Text>
          </Pressable>

          {dados.boxes.map((box) => (
            <View key={box.id} style={{ marginBottom: espaco.md }}>
              <View style={[ui.linhaCentro, { marginBottom: 6 }]}>
                <Ionicons name="construct-outline" size={16} color={cores.textoSuave} />
                <Text style={[ui.secaoTitulo, { marginLeft: 6 }]}>
                  {box.nome}
                  {!box.ativo ? ' (inativo)' : ''}
                </Text>
              </View>
              {box.agendamentos.length === 0 ? (
                <Text style={[ui.textoSuave, estilos.livre]}>Livre o dia todo</Text>
              ) : (
                box.agendamentos.map((a) => (
                  <Cartao key={a.id} onPress={() => router.push(`/agenda/${a.id}`)} estilo={estilos.slot}>
                    <View style={estilos.horario}>
                      <Text style={estilos.horaTexto}>{hora(a.inicio)}</Text>
                      <Text style={ui.textoSuave}>{hora(a.fim)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{a.servico.nome}</Text>
                      <Text style={ui.textoSuave}>
                        {a.cliente.nome} · {a.veiculo.modelo} {placa(a.veiculo.placa)}
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        <StatusBadge status={a.status} />
                      </View>
                    </View>
                  </Cartao>
                ))
              )}
            </View>
          ))}
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  navegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espaco.md,
  },
  dia: { fontSize: 17, fontWeight: '700', textAlign: 'center', color: cores.texto, textTransform: 'capitalize' },
  resumo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginVertical: espaco.md },
  resumoItem: { borderRadius: raio.pill, paddingHorizontal: 12, paddingVertical: 6 },
  livre: {
    padding: espaco.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.borda,
    borderRadius: raio.md,
  },
  slot: { flexDirection: 'row', padding: espaco.md },
  horario: { width: 60, marginRight: espaco.md, borderRightWidth: 2, borderRightColor: cores.destaque },
  horaTexto: { fontWeight: '700', fontSize: 16, color: cores.primaria },
});
