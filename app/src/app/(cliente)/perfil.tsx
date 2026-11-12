import { useState } from 'react';
import { Botao, Campo, Cartao, MensagemErro, Secao, Tela, TextoSuave, Titulo } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { api, mensagemDeErro } from '../../services/api';
import type { Usuario } from '../../services/tipos';
import { avisar, confirmar } from '../../utils/dialogos';

export default function Perfil() {
  const { usuario, atualizarUsuario, sair } = useAuth();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await api.put<Usuario>('/auth/me', {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        ...(novaSenha ? { senhaAtual, novaSenha } : {}),
      });
      atualizarUsuario(atualizado);
      setSenhaAtual('');
      setNovaSenha('');
      avisar('Dados atualizados!');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function aoSair() {
    if (await confirmar('Sair', 'Deseja sair da sua conta?', 'Sair')) await sair();
  }

  return (
    <Tela>
      <Titulo>{usuario?.nome}</Titulo>
      <TextoSuave>{usuario?.email}</TextoSuave>

      <Secao titulo="Meus dados">
        <Cartao>
          {erro && <MensagemErro mensagem={erro} />}
          <Campo rotulo="Nome" value={nome} onChangeText={setNome} />
          <Campo rotulo="Telefone / WhatsApp" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
          <Campo rotulo="Senha atual (só para trocar a senha)" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry />
          <Campo rotulo="Nova senha" value={novaSenha} onChangeText={setNovaSenha} secureTextEntry />
          <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} />
        </Cartao>
      </Secao>

      <Botao titulo="Sair da conta" icone="log-out-outline" variante="texto" onPress={aoSair} />
    </Tela>
  );
}
