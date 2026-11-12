import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/** Direciona cada perfil para a sua área inicial. */
export default function Inicio() {
  const { usuario } = useAuth();

  if (!usuario) return <Redirect href="/login" />;
  if (usuario.perfil === 'ADMIN') return <Redirect href="/agenda" />;
  return <Redirect href="/inicio" />;
}
