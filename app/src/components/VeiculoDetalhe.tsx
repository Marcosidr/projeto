import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemDeErro } from '../services/api';
import type { Agendamento, Veiculo } from '../services/tipos';
import { espaco } from '../theme';
import { avisar, confirmar } from '../utils/dialogos';
import { dataCurta, placa } from '../utils/formatar';
import { useDados } from '../utils/useDados';
import { GaleriaVeiculo } from './GaleriaVeiculo';
import {
  Botao,
  Carregando,
  Cartao,
  Linha,
  MensagemErro,
  Secao,
  StatusBadge,
  TextoSuave,
  Titulo,
  Vazio,
  estilos,
} from './ui';

/** Ficha do veículo: dados, fotos e histórico de atendimentos. */
export function VeiculoDetalhe({
  id,
  rotaAgendamento,
  rotaEditar,
}: {
  id: number;
  rotaAgendamento: (id: number) => string;
  rotaEditar: (id: number) => string;
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const ehCliente = usuario?.perfil === 'CLIENTE';

  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const [veiculo, historico] = await Promise.all([
      api.get<Veiculo>(`/veiculos/${id}`),
      api.get<Agendamento[]>(`/veiculos/${id}/historico`),
    ]);
    return { veiculo, historico };
  }, [id]);

  if (!dados) {
    return erro ? <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} /> : <Carregando />;
  }

  const { veiculo, historico } = dados;

  async function excluir() {
    if (!(await confirmar('Excluir veículo', `Excluir ${veiculo.modelo} (${placa(veiculo.placa)})?`, 'Excluir'))) return;
    try {
      await api.delete(`/veiculos/${veiculo.id}`);
      router.back();
    } catch (e) {
      avisar('Não foi possível excluir', mensagemDeErro(e));
    }
  }

  return (
    <View>
      {erro && <MensagemErro mensagem={erro} />}
      <Cartao>
        <Titulo>
          {veiculo.marca} {veiculo.modelo}
        </Titulo>
        <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 4 }}>{placa(veiculo.placa)}</Text>
        <Linha icone="calendar-outline">Ano {veiculo.ano}</Linha>
        {veiculo.cor && <Linha icone="color-palette-outline">{veiculo.cor}</Linha>}
        {veiculo.quilometragem != null && (
          <Linha icone="speedometer-outline">{veiculo.quilometragem.toLocaleString('pt-BR')} km</Linha>
        )}
        {!ehCliente && veiculo.cliente && <Linha icone="person-outline">Dono: {veiculo.cliente.nome}</Linha>}

        <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md }}>
          <Botao
            titulo="Editar"
            icone="create-outline"
            variante="secundario"
            estilo={{ flex: 1 }}
            onPress={() => router.push(rotaEditar(veiculo.id) as never)}
          />
          <Botao titulo="Excluir" icone="trash-outline" variante="texto" estilo={{ flex: 1 }} onPress={excluir} />
        </View>
      </Cartao>

      <Secao titulo="Fotos do veículo">
        <GaleriaVeiculo veiculoId={veiculo.id} imagens={veiculo.imagens ?? []} aoAlterar={recarregar} />
      </Secao>

      <Secao titulo={`Histórico (${historico.length})`}>
        {historico.length === 0 ? (
          <Vazio icone="time-outline" mensagem="Nenhum atendimento registrado para este veículo." />
        ) : (
          historico.map((a) => (
            <Cartao key={a.id} onPress={() => router.push(rotaAgendamento(a.id) as never)}>
              <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
                <Text style={{ fontWeight: '600', flex: 1 }}>{a.servico.nome}</Text>
                <StatusBadge status={a.status} />
              </View>
              <TextoSuave>{dataCurta(a.inicio)}</TextoSuave>
            </Cartao>
          ))
        )}
      </Secao>
      {carregando && <TextoSuave>Atualizando…</TextoSuave>}
    </View>
  );
}
