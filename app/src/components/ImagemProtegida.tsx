import { useEffect, useState } from 'react';
import { Image, Platform, View, type ImageStyle, type StyleProp } from 'react-native';
import { API_URL, obterToken } from '../services/api';
import { cores } from '../theme';

/**
 * As imagens só são entregues pela API com o token do usuário.
 * No celular o cabeçalho vai junto da imagem; no navegador
 * o arquivo é baixado com fetch e exibido a partir de um blob.
 */
export function ImagemProtegida({ imagemId, estilo }: { imagemId: number; estilo: StyleProp<ImageStyle> }) {
  const url = `${API_URL}/imagens/${imagemId}/arquivo`;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let ativo = true;
    let criado: string | null = null;
    fetch(url, { headers: { Authorization: `Bearer ${obterToken()}` } })
      .then((r) => r.blob())
      .then((blob) => {
        if (!ativo) return;
        criado = URL.createObjectURL(blob);
        setBlobUrl(criado);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [url]);

  if (Platform.OS === 'web') {
    return blobUrl ? (
      <Image source={{ uri: blobUrl }} style={estilo} />
    ) : (
      <View style={[estilo as object, { backgroundColor: cores.borda }]} />
    );
  }

  return <Image source={{ uri: url, headers: { Authorization: `Bearer ${obterToken()}` } }} style={estilo} />;
}
