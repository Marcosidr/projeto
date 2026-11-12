import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import type { NomeIcone } from '../../components/ui';
import { cores } from '../../theme';

const icone =
  (nome: NomeIcone) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={nome} color={color as string} size={size} />
  );

export default function ClienteLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.primaria,
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início', tabBarIcon: icone('home-outline') }} />
      <Tabs.Screen
        name="veiculos"
        options={{ title: 'Veículos', headerShown: false, tabBarIcon: icone('car-outline') }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{ title: 'Agendamentos', headerShown: false, tabBarIcon: icone('calendar-outline') }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icone('person-outline') }} />
    </Tabs>
  );
}
