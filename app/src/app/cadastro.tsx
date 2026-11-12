import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Botao, Campo, MensagemErro, Tela, TextoSuave } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { mensagemDeErro } from '../services/api';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', confirmacao: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: keyof typeof form) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  async function aoCadastrar() {
    if (form.senha !== form.confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        telefone: form.telefone.trim() || undefined,
      });
      router.replace('/');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <TextoSuave>Crie sua conta para cadastrar seus veículos e agendar serviços.</TextoSuave>
      <TextoSuave> </TextoSuave>
      {erro && <MensagemErro mensagem={erro} />}
      <Campo rotulo="Nome completo" value={form.nome} onChangeText={alterar('nome')} autoComplete="name" />
      <Campo
        rotulo="E-mail"
        value={form.email}
        onChangeText={alterar('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo
        rotulo="Telefone / WhatsApp (opcional)"
        value={form.telefone}
        onChangeText={alterar('telefone')}
        keyboardType="phone-pad"
        placeholder="(44) 99999-0000"
      />
      <Campo rotulo="Senha (mínimo 6 caracteres)" value={form.senha} onChangeText={alterar('senha')} secureTextEntry />
      <Campo rotulo="Confirme a senha" value={form.confirmacao} onChangeText={alterar('confirmacao')} secureTextEntry />
      <Botao titulo="Criar conta" onPress={aoCadastrar} carregando={enviando} />
    </Tela>
  );
}
