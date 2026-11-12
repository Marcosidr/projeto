import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Botao, Campo, Carregando, Chip, MensagemErro, Secao, Tela } from '../../../components/ui';
import { api, mensagemDeErro } from '../../../services/api';
import type { Perfil, Usuario } from '../../../services/tipos';

/** Cadastro/edição de clientes (e de novos administradores). */
export default function FormularioCliente() {
  const params = useLocalSearchParams<{ id?: string; perfil?: Perfil }>();
  const id = params.id;
  const router = useRouter();
  const navigation = useNavigation();
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [perfil, setPerfil] = useState<Perfil>(params.perfil ?? 'CLIENTE');
  const [carregando, setCarregando] = useState(Boolean(id));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar cadastro' : 'Novo cadastro' });
    if (!id) return;
    api
      .get<Usuario>(`/usuarios/${id}`)
      .then((u) => setForm({ nome: u.nome, email: u.email, telefone: u.telefone ?? '', senha: '' }))
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [id, navigation]);

  const alterar = (campo: keyof typeof form) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      if (id) {
        await api.put(`/usuarios/${id}`, {
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim() || null,
          ...(form.senha ? { senha: form.senha } : {}),
        });
      } else {
        await api.post('/usuarios', {
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim() || undefined,
          senha: form.senha,
          perfil,
        });
      }
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
      <Campo rotulo="Nome completo" value={form.nome} onChangeText={alterar('nome')} />
      <Campo
        rotulo="E-mail"
        value={form.email}
        onChangeText={alterar('email')}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Campo rotulo="Telefone" value={form.telefone} onChangeText={alterar('telefone')} keyboardType="phone-pad" />
      <Campo
        rotulo={id ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}
        value={form.senha}
        onChangeText={alterar('senha')}
        secureTextEntry
      />
      {!id && (
        <Secao titulo="Perfil de acesso">
          <View style={{ flexDirection: 'row' }}>
            <Chip rotulo="Cliente" ativo={perfil === 'CLIENTE'} onPress={() => setPerfil('CLIENTE')} />
            <Chip rotulo="Administrador" ativo={perfil === 'ADMIN'} onPress={() => setPerfil('ADMIN')} />
          </View>
        </Secao>
      )}
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} estilo={{ marginTop: 12 }} />
    </Tela>
  );
}
