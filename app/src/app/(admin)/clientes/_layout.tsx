import { Stack } from 'expo-router';
import { BotaoSair } from '../../../components/BotaoSair';
import { cores } from '../../../theme';

export default function ClientesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Clientes', headerRight: () => <BotaoSair /> }} />
      <Stack.Screen name="form" options={{ title: 'Cliente' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ficha do cliente' }} />
      <Stack.Screen name="veiculo/[id]" options={{ title: 'Veículo' }} />
      <Stack.Screen name="veiculo-form" options={{ title: 'Veículo' }} />
    </Stack>
  );
}
