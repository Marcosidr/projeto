import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemDeErro } from '../services/api';
import type { Agendamento } from '../services/tipos';
import { cores, espaco } from '../theme';
import { avisar, confirmar } from '../utils/dialogos';
import { STATUS_INFO, dataHora, duracao, hora, moeda, placa } from '../utils/formatar';
import { useDados } from '../utils/useDados';
import { GaleriaVeiculo } from './GaleriaVeiculo';
import {
  Botao,
  Campo,
  Carregando,
  Cartao,
  Linha,
  MensagemErro,
  Secao,
  StatusBadge,
  TextoSuave,
  Titulo,
} from './ui';

type Acao = 'confirmar' | 'recusar' | 'iniciar' | 'concluir' | 'cancelar';

/** Detalhe do agendamento com as ações permitidas para o perfil logado. */
export function AgendamentoDetalhe({ id }: { id: number }) {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const [executando, setExecutando] = useState<Acao | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const { dados: agendamento, erro, recarregar } = useDados(
    () => api.get<Agendamento>(`/agendamentos/${id}`),
    [id],
  );

  if (!agendamento) {
    return erro ? <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} /> : <Carregando />;
  }

  async function executar(acao: Acao, corpo?: object) {
    if (acao === 'cancelar') {
      const ok = await confirmar('Cancelar agendamento', 'Tem certeza? O horário será liberado.', 'Cancelar agendamento');
      if (!ok) return;
    }
    setExecutando(acao);
    try {
      await api.patch<Agendamento>(`/agendamentos/${id}/${acao}`, corpo);
      setRecusando(false);
      setMotivo('');
      await recarregar();
    } catch (e) {
      avisar('Não foi possível concluir a ação', mensagemDeErro(e));
    } finally {
      setExecutando(null);
    }
  }

  const { status } = agendamento;
  const podeCancelar = status === 'PENDENTE' || status === 'CONFIRMADO';

  return (
    <View>
      {erro && <MensagemErro mensagem={erro} />}
      <Cartao>
        <StatusBadge status={status} />
        <View style={{ height: espaco.sm }} />
        <Titulo>{agendamento.servico.nome}</Titulo>
        <Linha icone="calendar-outline">{dataHora(agendamento.inicio)}</Linha>
        <Linha icone="time-outline">
          Até {hora(agendamento.fim)} ({duracao(agendamento.servico.duracaoMinutos)})
        </Linha>
        <Linha icone="car-outline">
          {agendamento.veiculo.marca} {agendamento.veiculo.modelo} · {placa(agendamento.veiculo.placa)}
        </Linha>
        <Linha icone="construct-outline">{agendamento.box.nome}</Linha>
        <Linha icone="cash-outline">{moeda(agendamento.precoCobrado)}</Linha>
        {ehAdmin && (
          <>
            <Linha icone="person-outline">{agendamento.cliente.nome}</Linha>
            {agendamento.cliente.telefone && <Linha icone="call-outline">{agendamento.cliente.telefone}</Linha>}
          </>
        )}
        {agendamento.observacoes && (
          <Text style={{ marginTop: espaco.md, color: cores.texto }}>“{agendamento.observacoes}”</Text>
        )}
        {agendamento.motivoRecusa && (
          <Text style={{ marginTop: espaco.md, color: cores.perigo }}>Motivo da recusa: {agendamento.motivoRecusa}</Text>
        )}
      </Cartao>

      {/* Ações da oficina */}
      {ehAdmin && status === 'PENDENTE' && !recusando && (
        <View style={{ flexDirection: 'row', gap: espaco.sm }}>
          <Botao
            titulo="Confirmar"
            icone="checkmark-circle-outline"
            estilo={{ flex: 1 }}
            carregando={executando === 'confirmar'}
            onPress={() => executar('confirmar')}
          />
          <Botao
            titulo="Recusar"
            icone="close-circle-outline"
            variante="secundario"
            estilo={{ flex: 1 }}
            onPress={() => setRecusando(true)}
          />
        </View>
      )}
      {ehAdmin && recusando && (
        <Cartao>
          <Campo
            rotulo="Motivo da recusa"
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ex.: peça indisponível nesta data"
            multiline
          />
          <View style={{ flexDirection: 'row', gap: espaco.sm }}>
            <Botao titulo="Voltar" variante="texto" estilo={{ flex: 1 }} onPress={() => setRecusando(false)} />
            <Botao
              titulo="Recusar"
              variante="perigo"
              estilo={{ flex: 1 }}
              carregando={executando === 'recusar'}
              desabilitado={motivo.trim().length < 3}
              onPress={() => executar('recusar', { motivo })}
            />
          </View>
        </Cartao>
      )}
      {ehAdmin && status === 'CONFIRMADO' && (
        <Botao
          titulo="Iniciar atendimento"
          icone="play-circle-outline"
          carregando={executando === 'iniciar'}
          onPress={() => executar('iniciar')}
        />
      )}
      {ehAdmin && status === 'EM_ANDAMENTO' && (
        <Botao
          titulo="Concluir atendimento"
          icone="checkmark-done-outline"
          carregando={executando === 'concluir'}
          onPress={() => executar('concluir')}
        />
      )}
      {podeCancelar && !recusando && (
        <Botao
          titulo="Cancelar agendamento"
          variante="texto"
          estilo={{ marginTop: espaco.sm }}
          carregando={executando === 'cancelar'}
          onPress={() => executar('cancelar')}
        />
      )}

      <Secao titulo="Fotos do veículo neste atendimento">
        <GaleriaVeiculo
          veiculoId={agendamento.veiculoId}
          agendamentoId={agendamento.id}
          imagens={agendamento.imagens ?? []}
          aoAlterar={recarregar}
        />
      </Secao>

      <Secao titulo="Acompanhamento">
        <Cartao>
          {(agendamento.historico ?? []).map((h, i, lista) => (
            <View key={h.id} style={{ flexDirection: 'row' }}>
              <View style={{ alignItems: 'center', marginRight: espaco.md }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    marginTop: 4,
                    backgroundColor: STATUS_INFO[h.statusNovo].cor,
                  }}
                />
                {i < lista.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: cores.borda }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: espaco.md }}>
                <Text style={{ fontWeight: '600' }}>{STATUS_INFO[h.statusNovo].rotulo}</Text>
                <TextoSuave>
                  {dataHora(h.criadoEm)} · {h.usuario.perfil === 'ADMIN' ? 'Oficina' : h.usuario.nome}
                </TextoSuave>
                {h.observacao && <TextoSuave>{h.observacao}</TextoSuave>}
              </View>
            </View>
          ))}
        </Cartao>
      </Secao>
    </View>
  );
}
