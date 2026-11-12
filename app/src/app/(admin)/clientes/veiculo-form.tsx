import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Botao, Campo, Carregando, MensagemErro, Tela } from '../../../components/ui';
import { api, mensagemDeErro } from '../../../services/api';
import type { Veiculo } from '../../../services/tipos';

/** Cadastro de veículo pela oficina (?clienteId=) ou edição (?id=). */
export default function FormularioVeiculoAdmin() {
  const { id, clienteId } = useLocalSearchParams<{ id?: string; clienteId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [form, setForm] = useState({ placa: '', marca: '', modelo: '', ano: '', cor: '', quilometragem: '' });
  const [carregando, setCarregando] = useState(Boolean(id));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar veículo' : 'Novo veículo' });
    if (!id) return;
    api
      .get<Veiculo>(`/veiculos/${id}`)
      .then((v) =>
        setForm({
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          ano: String(v.ano),
          cor: v.cor ?? '',
          quilometragem: v.quilometragem != null ? String(v.quilometragem) : '',
        }),
      )
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [id, navigation]);

  const alterar = (campo: keyof typeof form) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const corpo = {
      placa: form.placa,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: Number(form.ano),
      cor: form.cor.trim() || undefined,
      quilometragem: form.quilometragem ? Number(form.quilometragem.replace(/\D/g, '')) : undefined,
    };
    try {
      if (id) await api.put(`/veiculos/${id}`, corpo);
      else await api.post('/veiculos', { ...corpo, clienteId: Number(clienteId) });
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela>
      {erro && <MensagemErro mensagem={erro} />}
      <Campo
        rotulo="Placa"
        value={form.placa}
        onChangeText={(t) => alterar('placa')(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={8}
      />
      <Campo rotulo="Marca" value={form.marca} onChangeText={alterar('marca')} />
      <Campo rotulo="Modelo" value={form.modelo} onChangeText={alterar('modelo')} />
      <Campo rotulo="Ano" value={form.ano} onChangeText={alterar('ano')} keyboardType="number-pad" maxLength={4} />
      <Campo rotulo="Cor" value={form.cor} onChangeText={alterar('cor')} />
      <Campo
        rotulo="Quilometragem"
        value={form.quilometragem}
        onChangeText={alterar('quilometragem')}
        keyboardType="number-pad"
      />
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}
