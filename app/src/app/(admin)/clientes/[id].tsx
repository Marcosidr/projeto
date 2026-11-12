import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Botao,
  Carregando,
  Cartao,
  Linha,
  MensagemErro,
  Secao,
  StatusBadge,
  Tela,
  TextoSuave,
  Titulo,
  Vazio,
  estilos,
} from '../../../components/ui';
import { api, mensagemDeErro } from '../../../services/api';
import type { Agendamento, Usuario, Veiculo } from '../../../services/tipos';
import { cores, espaco } from '../../../theme';
import { avisar, confirmar } from '../../../utils/dialogos';
import { dataHora, placa } from '../../../utils/formatar';
import { useDados } from '../../../utils/useDados';

type FichaCliente = Usuario & {
  veiculos: Veiculo[];
  agendamentos: (Pick<Agendamento, 'id' | 'inicio' | 'status'> & {
    servico: { nome: string };
    veiculo: { placa: string; modelo: string };
  })[];
};

export default function FichaDoCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dados: cliente, erro, carregando, recarregar } = useDados(
    () => api.get<FichaCliente>(`/usuarios/${id}`),
    [id],
  );

  if (!cliente) return erro ? <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} /> : <Carregando />;

  async function alternarAtivo() {
    const acao = cliente!.ativo ? 'Desativar' : 'Reativar';
    if (!(await confirmar(`${acao} cliente`, `${acao} o acesso de ${cliente!.nome}?`, acao))) return;
    try {
      await api.patch(`/usuarios/${cliente!.id}/permissoes`, { ativo: !cliente!.ativo });
      await recarregar();
    } catch (e) {
      avisar('Erro', mensagemDeErro(e));
    }
  }

  async function excluir() {
    if (!(await confirmar('Excluir cliente', `Excluir ${cliente!.nome} e seus veículos?`, 'Excluir'))) return;
    try {
      await api.delete(`/usuarios/${cliente!.id}`);
      router.back();
    } catch (e) {
      avisar('Não foi possível excluir', mensagemDeErro(e));
    }
  }

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Cartao>
        <Titulo>{cliente.nome}</Titulo>
        {!cliente.ativo && <Text style={{ color: cores.perigo, fontWeight: '700' }}>Conta desativada</Text>}
        <Linha icone="mail-outline">{cliente.email}</Linha>
        {cliente.telefone && <Linha icone="call-outline">{cliente.telefone}</Linha>}
        <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md }}>
          <Botao
            titulo="Editar"
            variante="secundario"
            estilo={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/clientes/form', params: { id: cliente.id } })}
          />
          <Botao
            titulo={cliente.ativo ? 'Desativar' : 'Reativar'}
            variante="secundario"
            estilo={{ flex: 1 }}
            onPress={alternarAtivo}
          />
        </View>
        <Botao titulo="Excluir cliente" variante="texto" onPress={excluir} />
      </Cartao>

      <Secao
        titulo={`Veículos (${cliente.veiculos.length})`}
        acao={
          <Botao
            titulo="Adicionar"
            variante="texto"
            icone="add"
            onPress={() => router.push({ pathname: '/clientes/veiculo-form', params: { clienteId: cliente.id } })}
          />
        }
      >
        {cliente.veiculos.length === 0 && <Vazio icone="car-outline" mensagem="Nenhum veículo cadastrado." />}
        {cliente.veiculos.map((v) => (
          <Cartao key={v.id} onPress={() => router.push(`/clientes/veiculo/${v.id}`)}>
            <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
              <Text style={{ fontWeight: '600' }}>
                {v.marca} {v.modelo} ({v.ano})
              </Text>
              <Text style={{ fontWeight: '700', color: cores.primaria }}>{placa(v.placa)}</Text>
            </View>
          </Cartao>
        ))}
      </Secao>

      <Secao titulo="Últimos agendamentos">
        {cliente.agendamentos.length === 0 && <TextoSuave>Nenhum agendamento.</TextoSuave>}
        {cliente.agendamentos.map((a) => (
          <Cartao key={a.id} onPress={() => router.push(`/agenda/${a.id}`)}>
            <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
              <Text style={{ fontWeight: '600', flex: 1 }}>{a.servico.nome}</Text>
              <StatusBadge status={a.status} />
            </View>
            <TextoSuave>
              {dataHora(a.inicio)} · {a.veiculo.modelo} {placa(a.veiculo.placa)}
            </TextoSuave>
          </Cartao>
        ))}
      </Secao>
    </Tela>
  );
}
