import { Stack } from 'expo-router';
import { cores } from '../../../theme';

export default function VeiculosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Meus veículos' }} />
      <Stack.Screen name="form" options={{ title: 'Veículo' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes do veículo' }} />
    </Stack>
  );
}
