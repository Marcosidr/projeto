import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { api } from './api';
import type { Imagem } from './tipos';

export const MAX_IMAGENS = 5;

/** Abre a galeria ou a câmera e retorna as fotos escolhidas. */
export async function escolherImagens(origem: 'galeria' | 'camera') {
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) throw new Error('Permissão da câmera negada.');
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    return resultado.canceled ? [] : resultado.assets;
  }

  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) throw new Error('Permissão da galeria negada.');
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_IMAGENS,
    quality: 0.7,
  });
  return resultado.canceled ? [] : resultado.assets.slice(0, MAX_IMAGENS);
}

function extensaoDoTipo(tipo: string) {
  return tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
}

/** Envia as fotos para a API no campo multipart "imagens". */
export async function enviarImagens(
  veiculoId: number,
  fotos: ImagePicker.ImagePickerAsset[],
  agendamentoId?: number,
) {
  const form = new FormData();

  for (const [i, foto] of fotos.entries()) {
    const tipo = foto.mimeType ?? 'image/jpeg';
    const nome = foto.fileName ?? `foto-${i + 1}.${extensaoDoTipo(tipo)}`;

    if (Platform.OS === 'web') {
      const blob = await (await fetch(foto.uri)).blob();
      form.append('imagens', new File([blob], nome, { type: tipo }));
    } else {
      // No React Native o arquivo é descrito por { uri, name, type }.
      form.append('imagens', { uri: foto.uri, name: nome, type: tipo } as unknown as Blob);
    }
  }

  if (agendamentoId) form.append('agendamentoId', String(agendamentoId));

  return api.post<Imagem[]>(`/veiculos/${veiculoId}/imagens`, form);
}
