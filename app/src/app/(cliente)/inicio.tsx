import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AgendamentoCard } from '../../components/AgendamentoCard';
import {
  Botao,
  Cartao,
  Linha,
  MensagemErro,
  Secao,
  Subtitulo,
  Tela,
  TextoSuave,
  Titulo,
  Vazio,
  estilos,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { Agendamento, Servico } from '../../services/tipos';
import { cores } from '../../theme';
import { duracao, moeda } from '../../utils/formatar';
import { useDados } from '../../utils/useDados';

export default function InicioCliente() {
  const { usuario } = useAuth();
  const router = useRouter();

  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const [servicos, proximos] = await Promise.all([
      api.get<Servico[]>('/servicos'),
      api.get<Agendamento[]>('/agendamentos?status=PENDENTE,CONFIRMADO,EM_ANDAMENTO'),
    ]);
    return { servicos, proximos: proximos.reverse() };
  });

  const primeiroNome = usuario?.nome.split(' ')[0];

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Titulo>Olá, {primeiroNome}!</Titulo>
      <TextoSuave>Escolha um serviço e reserve um horário na oficina.</TextoSuave>
      <Botao
        titulo="Novo agendamento"
        icone="add-circle-outline"
        estilo={{ marginTop: 16 }}
        onPress={() => router.push('/agendamentos/novo')}
      />

      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}

      {dados && dados.proximos.length > 0 && (
        <Secao titulo="Seus próximos atendimentos">
          {dados.proximos.slice(0, 3).map((a) => (
            <AgendamentoCard key={a.id} agendamento={a} onPress={() => router.push(`/agendamentos/${a.id}`)} />
          ))}
        </Secao>
      )}

      <Secao titulo="Serviços da oficina">
        {dados?.servicos.length === 0 && <Vazio icone="construct-outline" mensagem="Nenhum serviço disponível." />}
        {dados?.servicos.map((s) => (
          <Cartao
            key={s.id}
            onPress={() => router.push({ pathname: '/agendamentos/novo', params: { servicoId: s.id } })}
          >
            <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
              <Subtitulo>{s.nome}</Subtitulo>
              <Text style={{ fontWeight: '700', color: cores.primaria }}>{moeda(s.preco)}</Text>
            </View>
            <TextoSuave>{s.descricao}</TextoSuave>
            <Linha icone="time-outline">{duracao(s.duracaoMinutos)}</Linha>
          </Cartao>
        ))}
      </Secao>
    </Tela>
  );
}
