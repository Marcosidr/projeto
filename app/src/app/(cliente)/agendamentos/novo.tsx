import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import {
  Botao,
  Campo,
  Carregando,
  Cartao,
  Chip,
  MensagemErro,
  Secao,
  Tela,
  TextoSuave,
  Vazio,
} from '../../../components/ui';
import { api, mensagemDeErro } from '../../../services/api';
import type { Agendamento, Disponibilidade, Servico, Veiculo } from '../../../services/tipos';
import { cores } from '../../../theme';
import { avisar } from '../../../utils/dialogos';
import { dataHora, duracao, moeda, placa, proximosDiasUteis } from '../../../utils/formatar';
import { useDados } from '../../../utils/useDados';

export default function NovoAgendamento() {
  const router = useRouter();
  const params = useLocalSearchParams<{ servicoId?: string }>();

  const { dados, erro: erroCarga, recarregar } = useDados(async () => {
    const [veiculos, servicos] = await Promise.all([
      api.get<Veiculo[]>('/veiculos'),
      api.get<Servico[]>('/servicos'),
    ]);
    return { veiculos, servicos };
  });

  const dias = useMemo(() => proximosDiasUteis(14), []);
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [servicoId, setServicoId] = useState<number | null>(params.servicoId ? Number(params.servicoId) : null);
  const [data, setData] = useState<string>(dias[0].iso);
  const [inicio, setInicio] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade | null>(null);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Seleciona automaticamente quando o cliente tem um único veículo.
  useEffect(() => {
    if (dados?.veiculos.length === 1 && veiculoId === null) setVeiculoId(dados.veiculos[0].id);
  }, [dados, veiculoId]);

  // Busca os horários livres sempre que o serviço ou o dia mudam.
  useEffect(() => {
    setInicio(null);
    if (!servicoId) return;
    let ativo = true;
    setBuscandoHorarios(true);
    api
      .get<Disponibilidade>(`/agendamentos/disponibilidade?data=${data}&servicoId=${servicoId}`)
      .then((d) => ativo && setDisponibilidade(d))
      .catch((e) => ativo && setErro(mensagemDeErro(e)))
      .finally(() => ativo && setBuscandoHorarios(false));
    return () => {
      ativo = false;
    };
  }, [servicoId, data]);

  if (!dados) return erroCarga ? <MensagemErro mensagem={erroCarga} aoTentarNovamente={recarregar} /> : <Carregando />;

  const servico = dados.servicos.find((s) => s.id === servicoId);
  const horariosLivres = disponibilidade?.horarios.filter((h) => h.disponivel) ?? [];

  async function solicitar() {
    if (!veiculoId || !servicoId || !inicio) return;
    setEnviando(true);
    setErro(null);
    try {
      const criado = await api.post<Agendamento>('/agendamentos', {
        veiculoId,
        servicoId,
        inicio,
        observacoes: observacoes.trim() || undefined,
      });
      avisar('Solicitação enviada!', 'A oficina vai analisar e confirmar o seu horário.');
      router.replace(`/agendamentos/${criado.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (dados.veiculos.length === 0) {
    return (
      <Tela>
        <Vazio icone="car-outline" mensagem="Cadastre um veículo antes de agendar um serviço." />
        <Botao titulo="Cadastrar veículo" onPress={() => router.push('/veiculos/form')} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Secao titulo="1. Veículo">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dados.veiculos.map((v) => (
            <Chip
              key={v.id}
              rotulo={`${v.modelo} · ${placa(v.placa)}`}
              ativo={veiculoId === v.id}
              onPress={() => setVeiculoId(v.id)}
            />
          ))}
        </View>
      </Secao>

      <Secao titulo="2. Serviço">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dados.servicos.map((s) => (
            <Chip key={s.id} rotulo={s.nome} ativo={servicoId === s.id} onPress={() => setServicoId(s.id)} />
          ))}
        </View>
        {servico && (
          <TextoSuave>
            {moeda(servico.preco)} · duração estimada de {duracao(servico.duracaoMinutos)}
          </TextoSuave>
        )}
      </Secao>

      <Secao titulo="3. Dia">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {dias.map((d) => (
              <Chip key={d.iso} rotulo={`${d.diaSemana} ${d.dia}`} ativo={data === d.iso} onPress={() => setData(d.iso)} />
            ))}
          </View>
        </ScrollView>
      </Secao>

      <Secao titulo="4. Horário">
        {!servicoId ? (
          <TextoSuave>Escolha um serviço para ver os horários.</TextoSuave>
        ) : buscandoHorarios ? (
          <ActivityIndicator color={cores.primaria} />
        ) : horariosLivres.length === 0 ? (
          <TextoSuave>Nenhum horário livre neste dia. Tente outra data.</TextoSuave>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {disponibilidade?.horarios.map((h) => (
              <Chip
                key={h.inicio}
                rotulo={h.horario}
                ativo={inicio === h.inicio}
                desabilitado={!h.disponivel}
                onPress={() => setInicio(h.inicio)}
              />
            ))}
          </View>
        )}
      </Secao>

      <Secao titulo="5. Observações (opcional)">
        <Campo
          rotulo="Descreva o problema ou o que precisa"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          maxLength={500}
          placeholder="Ex.: barulho ao frear"
        />
      </Secao>

      {erro && <MensagemErro mensagem={erro} />}

      {inicio && servico && (
        <Cartao estilo={{ backgroundColor: cores.primariaClara }}>
          <Text style={{ fontWeight: '600' }}>{servico.nome}</Text>
          <TextoSuave>{dataHora(inicio)}</TextoSuave>
        </Cartao>
      )}

      <Botao
        titulo="Solicitar agendamento"
        onPress={solicitar}
        carregando={enviando}
        desabilitado={!veiculoId || !servicoId || !inicio}
      />
      <View style={{ height: 8 }} />
      <TextoSuave>O agendamento fica pendente até a oficina confirmar.</TextoSuave>
    </Tela>
  );
}
