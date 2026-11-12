import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { confirmar } from '../utils/dialogos';

export function BotaoSair() {
  const { sair } = useAuth();
  return (
    <Pressable
      accessibilityLabel="Sair"
      hitSlop={10}
      style={{ marginRight: 16 }}
      onPress={async () => {
        if (await confirmar('Sair', 'Deseja sair da conta da oficina?', 'Sair')) await sair();
      }}
    >
      <Ionicons name="log-out-outline" size={22} color="#fff" />
    </Pressable>
  );
}
