import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Carregando } from '../components/ui';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { cores } from '../theme';

function Navegacao() {
  const { usuario, carregando } = useAuth();

  if (carregando) return <Carregando />;

  const perfil = usuario?.perfil;

  // Cada grupo de telas só existe para o perfil correto (RN10):
  // visitantes veem login/cadastro, clientes veem (cliente) e a oficina vê (admin).
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
      </Stack.Protected>
      <Stack.Protected guard={perfil === 'CLIENTE'}>
        <Stack.Screen name="(cliente)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={perfil === 'ADMIN'}>
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Navegacao />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
