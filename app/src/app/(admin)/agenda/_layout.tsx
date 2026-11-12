import { Stack } from 'expo-router';
import { BotaoSair } from '../../../components/BotaoSair';
import { cores } from '../../../theme';

export default function AgendaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Agenda da oficina', headerRight: () => <BotaoSair /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Agendamento' }} />
    </Stack>
  );
}
