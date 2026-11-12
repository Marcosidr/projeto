import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Botao, Campo, Cartao, Linha, MensagemErro, Subtitulo, Tela, Vazio, estilos } from '../../../components/ui';
import { api } from '../../../services/api';
import type { Usuario } from '../../../services/tipos';
import { cores } from '../../../theme';
import { useDados } from '../../../utils/useDados';

export default function Clientes() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');

  // Espera o usuário parar de digitar antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, erro, carregando, recarregar } = useDados(
    () => api.get<Usuario[]>(`/usuarios?perfil=CLIENTE${termo ? `&busca=${encodeURIComponent(termo)}` : ''}`),
    [termo],
  );

  return (
    <Tela carregando={carregando} aoAtualizar={recarregar}>
      <Campo
        rotulo="Buscar por nome, e-mail, telefone ou placa"
        value={busca}
        onChangeText={setBusca}
        autoCapitalize="none"
        placeholder="Digite para buscar…"
      />
      <Botao
        titulo="Novo cliente"
        icone="person-add-outline"
        variante="secundario"
        onPress={() => router.push('/clientes/form')}
        estilo={{ marginBottom: 16 }}
      />
      {erro && <MensagemErro mensagem={erro} aoTentarNovamente={recarregar} />}
      {dados?.length === 0 && <Vazio icone="people-outline" mensagem="Nenhum cliente encontrado." />}
      {dados?.map((c) => (
        <Cartao key={c.id} onPress={() => router.push(`/clientes/${c.id}`)}>
          <View style={[estilos.linhaCentro, { justifyContent: 'space-between' }]}>
            <Subtitulo>{c.nome}</Subtitulo>
            {!c.ativo && <Text style={{ color: cores.perigo, fontWeight: '600' }}>Inativo</Text>}
          </View>
          <Linha icone="mail-outline">{c.email}</Linha>
          {c.telefone && <Linha icone="call-outline">{c.telefone}</Linha>}
          <Linha icone="car-outline">
            {c._count?.veiculos ?? 0} veículo(s) · {c._count?.agendamentos ?? 0} agendamento(s)
          </Linha>
        </Cartao>
      ))}
    </Tela>
  );
}
