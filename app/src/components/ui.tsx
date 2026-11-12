import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { cores, espaco, raio } from '../theme';
import type { StatusAgendamento } from '../services/tipos';
import { STATUS_INFO } from '../utils/formatar';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

export function Tela({
  children,
  carregando = false,
  aoAtualizar,
  rolavel = true,
}: {
  children: ReactNode;
  carregando?: boolean;
  aoAtualizar?: () => void;
  rolavel?: boolean;
}) {
  if (!rolavel) return <View style={[estilos.tela, estilos.conteudo]}>{children}</View>;
  return (
    <ScrollView
      style={estilos.tela}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        aoAtualizar ? <RefreshControl refreshing={carregando} onRefresh={aoAtualizar} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'texto';

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  icone,
  estilo,
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: NomeIcone;
  estilo?: StyleProp<ViewStyle>;
}) {
  const inativo = desabilitado || carregando;
  const corTexto =
    variante === 'primario' || variante === 'perigo' ? '#fff' : variante === 'texto' ? cores.primaria : cores.primaria;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        estilos[`botao_${variante}`],
        inativo && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <View style={estilos.linhaCentro}>
          {icone && <Ionicons name={icone} size={18} color={corTexto} style={{ marginRight: 6 }} />}
          <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, erro, ...props }: TextInputProps & { rotulo: string; erro?: string }) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textoSuave}
        {...props}
        style={[estilos.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, erro && { borderColor: cores.perigo }]}
      />
      {erro && <Text style={estilos.erroCampo}>{erro}</Text>}
    </View>
  );
}

export function Cartao({
  children,
  onPress,
  estilo,
}: {
  children: ReactNode;
  onPress?: () => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [estilos.cartao, pressed && { opacity: 0.85 }, estilo]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.cartao, estilo]}>{children}</View>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.subtitulo}>{children}</Text>;
}

export function TextoSuave({ children }: { children: ReactNode }) {
  return <Text style={estilos.textoSuave}>{children}</Text>;
}

export function Linha({ icone, children }: { icone: NomeIcone; children: ReactNode }) {
  return (
    <View style={[estilos.linhaCentro, { marginTop: 4 }]}>
      <Ionicons name={icone} size={15} color={cores.textoSuave} style={{ marginRight: 6 }} />
      <Text style={estilos.textoSuave}>{children}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  const info = STATUS_INFO[status];
  return (
    <View style={[estilos.badge, { backgroundColor: info.fundo }]}>
      <Text style={[estilos.badgeTexto, { color: info.cor }]}>{info.rotulo}</Text>
    </View>
  );
}

export function Chip({
  rotulo,
  ativo,
  onPress,
  desabilitado,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  desabilitado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={[estilos.chip, ativo && estilos.chipAtivo, desabilitado && { opacity: 0.35 }]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: '#fff' }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function Carregando() {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

export function Vazio({ icone, mensagem }: { icone: NomeIcone; mensagem: string }) {
  return (
    <View style={[estilos.centro, { paddingVertical: 40 }]}>
      <Ionicons name={icone} size={42} color={cores.borda} />
      <Text style={[estilos.textoSuave, { marginTop: 8, textAlign: 'center' }]}>{mensagem}</Text>
    </View>
  );
}

export function MensagemErro({ mensagem, aoTentarNovamente }: { mensagem: string; aoTentarNovamente?: () => void }) {
  return (
    <View style={estilos.caixaErro}>
      <Text style={{ color: cores.perigo }}>{mensagem}</Text>
      {aoTentarNovamente && (
        <Botao titulo="Tentar novamente" variante="texto" onPress={aoTentarNovamente} estilo={{ marginTop: 4 }} />
      )}
    </View>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ marginTop: espaco.lg }}>
      <View style={[estilos.linhaCentro, { justifyContent: 'space-between', marginBottom: espaco.sm }]}>
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
        {acao}
      </View>
      {children}
    </View>
  );
}

export const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, paddingBottom: 40 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  linhaCentro: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 16, fontWeight: '600', color: cores.texto },
  secaoTitulo: { fontSize: 13, fontWeight: '700', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.5 },
  textoSuave: { fontSize: 14, color: cores.textoSuave },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.texto, marginBottom: 6 },
  input: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    paddingVertical: 11,
    fontSize: 16,
    color: cores.texto,
  },
  erroCampo: { color: cores.perigo, fontSize: 12, marginTop: 4 },
  botao: {
    borderRadius: raio.md,
    paddingVertical: 13,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botao_primario: { backgroundColor: cores.primaria },
  botao_secundario: { backgroundColor: cores.primariaClara },
  botao_perigo: { backgroundColor: cores.perigo },
  botao_texto: { backgroundColor: 'transparent', paddingVertical: 8 },
  botaoTexto: { fontSize: 15, fontWeight: '600' },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    padding: espaco.lg,
    marginBottom: espaco.md,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  badge: { borderRadius: raio.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  chip: {
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: espaco.sm,
    marginBottom: espaco.sm,
  },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { fontSize: 14, fontWeight: '600', color: cores.texto },
  caixaErro: {
    backgroundColor: cores.perigoClaro,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.md,
  },
});
