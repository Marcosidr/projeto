import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, mensagemDeErro } from '../services/api';
import { enviarImagens, escolherImagens } from '../services/imagens';
import type { Imagem } from '../services/tipos';
import { cores, espaco, raio } from '../theme';
import { avisar, confirmar } from '../utils/dialogos';
import { dataCurta } from '../utils/formatar';
import { ImagemProtegida } from './ImagemProtegida';
import { Botao, TextoSuave, Vazio } from './ui';

export function GaleriaVeiculo({
  veiculoId,
  imagens,
  aoAlterar,
  agendamentoId,
}: {
  veiculoId: number;
  imagens: Imagem[];
  aoAlterar: () => void;
  agendamentoId?: number;
}) {
  const [enviando, setEnviando] = useState(false);

  async function adicionar(origem: 'galeria' | 'camera') {
    try {
      const fotos = await escolherImagens(origem);
      if (fotos.length === 0) return;
      setEnviando(true);
      await enviarImagens(veiculoId, fotos, agendamentoId);
      aoAlterar();
    } catch (e) {
      avisar('Não foi possível enviar', mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function remover(imagem: Imagem) {
    if (!(await confirmar('Remover foto', 'Deseja remover esta foto?', 'Remover'))) return;
    try {
      await api.delete(`/imagens/${imagem.id}`);
      aoAlterar();
    } catch (e) {
      avisar('Erro', mensagemDeErro(e));
    }
  }

  return (
    <View>
      {imagens.length === 0 ? (
        <Vazio icone="images-outline" mensagem="Nenhuma foto enviada ainda." />
      ) : (
        <View style={estilos.grade}>
          {imagens.map((imagem) => (
            <View key={imagem.id} style={estilos.item}>
              <ImagemProtegida imagemId={imagem.id} estilo={estilos.foto} />
              <View style={estilos.legenda}>
                <Text style={estilos.legendaTexto} numberOfLines={1}>
                  {dataCurta(imagem.criadoEm)}
                  {imagem.enviadoPor ? ` · ${imagem.enviadoPor.perfil === 'ADMIN' ? 'oficina' : 'cliente'}` : ''}
                </Text>
                <Pressable onPress={() => remover(imagem)} hitSlop={8} accessibilityLabel="Remover foto">
                  <Ionicons name="trash-outline" size={16} color={cores.perigo} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.sm }}>
        <Botao
          titulo="Galeria"
          icone="images-outline"
          variante="secundario"
          onPress={() => adicionar('galeria')}
          carregando={enviando}
          estilo={{ flex: 1 }}
        />
        <Botao
          titulo="Câmera"
          icone="camera-outline"
          variante="secundario"
          onPress={() => adicionar('camera')}
          desabilitado={enviando}
          estilo={{ flex: 1 }}
        />
      </View>
      <TextoSuave>JPG, PNG ou WEBP · até 5 fotos por envio · máx. 5 MB cada</TextoSuave>
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  item: {
    width: '48%',
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.borda,
  },
  foto: { width: '100%', aspectRatio: 4 / 3, backgroundColor: cores.borda },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6 },
  legendaTexto: { fontSize: 11, color: cores.textoSuave, flex: 1 },
});
