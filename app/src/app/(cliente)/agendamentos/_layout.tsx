import { Stack } from 'expo-router';
import { cores } from '../../../theme';

export default function AgendamentosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Meus agendamentos' }} />
      <Stack.Screen name="novo" options={{ title: 'Novo agendamento' }} />
      <Stack.Screen name="[id]" options={{ title: 'Agendamento' }} />
    </Stack>
  );
}
