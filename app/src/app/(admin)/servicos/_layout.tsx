import { Stack } from 'expo-router';
import { BotaoSair } from '../../../components/BotaoSair';
import { cores } from '../../../theme';

export default function ServicosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Serviços e preços', headerRight: () => <BotaoSair /> }} />
      <Stack.Screen name="form" options={{ title: 'Serviço' }} />
    </Stack>
  );
}
