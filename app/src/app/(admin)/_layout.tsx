import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { BotaoSair } from '../../components/BotaoSair';
import type { NomeIcone } from '../../components/ui';
import { cores } from '../../theme';

const icone =
  (nome: NomeIcone) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={nome} color={color as string} size={size} />
  );

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.primaria,
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        headerRight: () => <BotaoSair />,
      }}
    >
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', headerShown: false, tabBarIcon: icone('calendar-outline') }} />
      <Tabs.Screen name="solicitacoes" options={{ title: 'Solicitações', tabBarIcon: icone('notifications-outline') }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', headerShown: false, tabBarIcon: icone('people-outline') }} />
      <Tabs.Screen name="servicos" options={{ title: 'Serviços', headerShown: false, tabBarIcon: icone('construct-outline') }} />
      <Tabs.Screen name="usuarios" options={{ title: 'Usuários', tabBarIcon: icone('shield-checkmark-outline') }} />
    </Tabs>
  );
}
