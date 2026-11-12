import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Botao, Campo, Carregando, Chip, MensagemErro, Secao, Tela } from '../../../components/ui';
import { api, mensagemDeErro } from '../../../services/api';
import type { Servico } from '../../../services/tipos';
import { avisar, confirmar } from '../../../utils/dialogos';
import { duracao } from '../../../utils/formatar';

const DURACOES = [30, 60, 90, 120, 180, 240];

export default function FormularioServico() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '' });
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(Boolean(id));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar serviço' : 'Novo serviço' });
    if (!id) return;
    api
      .get<Servico>(`/servicos/${id}`)
      .then((s) => {
        setForm({ nome: s.nome, descricao: s.descricao, preco: String(Number(s.preco)).replace('.', ',') });
        setDuracaoMin(s.duracaoMinutos);
        setAtivo(s.ativo);
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [id, navigation]);

  const alterar = (campo: keyof typeof form) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const corpo = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco.replace(/\./g, '').replace(',', '.')),
      duracaoMinutos: duracaoMin,
      ativo,
    };
    try {
      if (id) await api.put(`/servicos/${id}`, corpo);
      else await api.post('/servicos', corpo);
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!(await confirmar('Excluir serviço', 'Serviços com histórico serão apenas desativados.', 'Excluir'))) return;
    try {
      const resposta = await api.delete<{ mensagem?: string } | undefined>(`/servicos/${id}`);
      if (resposta?.mensagem) avisar(resposta.mensagem);
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela>
      {erro && <MensagemErro mensagem={erro} />}
      <Campo rotulo="Nome do serviço" value={form.nome} onChangeText={alterar('nome')} />
      <Campo rotulo="Descrição" value={form.descricao} onChangeText={alterar('descricao')} multiline />
      <Campo rotulo="Preço (R$)" value={form.preco} onChangeText={alterar('preco')} keyboardType="decimal-pad" placeholder="150,00" />

      <Secao titulo="Duração (ocupa o box por esse tempo)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DURACOES.map((d) => (
            <Chip key={d} rotulo={duracao(d)} ativo={duracaoMin === d} onPress={() => setDuracaoMin(d)} />
          ))}
        </View>
      </Secao>

      {id && (
        <Secao titulo="Situação">
          <View style={{ flexDirection: 'row' }}>
            <Chip rotulo="Ativo" ativo={ativo} onPress={() => setAtivo(true)} />
            <Chip rotulo="Inativo" ativo={!ativo} onPress={() => setAtivo(false)} />
          </View>
        </Secao>
      )}

      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} estilo={{ marginTop: 12 }} />
      {id && <Botao titulo="Excluir serviço" variante="texto" onPress={excluir} />}
    </Tela>
  );
}
