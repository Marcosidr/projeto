import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Campo, MensagemErro } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { mensagemDeErro } from '../services/api';
import { cores, espaco } from '../theme';

export default function Login() {
  const { entrar } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar() {
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
      router.replace('/');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.primaria }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            <View style={estilos.icone}>
              <Ionicons name="construct" size={36} color={cores.primaria} />
            </View>
            <Text style={estilos.nome}>Oficina Agenda</Text>
            <Text style={estilos.slogan}>Agende a manutenção do seu carro sem telefonemas.</Text>
          </View>

          <View style={estilos.formulario}>
            {erro && <MensagemErro mensagem={erro} />}
            <Campo
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="seu@email.com"
            />
            <Campo
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••"
              onSubmitEditing={aoEntrar}
            />
            <Botao titulo="Entrar" onPress={aoEntrar} carregando={enviando} />
            <Link href="/cadastro" style={estilos.link}>
              Ainda não tem conta? <Text style={{ fontWeight: '700' }}>Cadastre-se</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.xl },
  marca: { alignItems: 'center', marginBottom: espaco.xl },
  icone: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: cores.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espaco.md,
  },
  nome: { fontSize: 28, fontWeight: '800', color: '#fff' },
  slogan: { color: '#CBD5E1', marginTop: 4, textAlign: 'center' },
  formulario: { backgroundColor: cores.superficie, borderRadius: 16, padding: espaco.xl },
  link: { textAlign: 'center', marginTop: espaco.lg, color: cores.primaria },
});
