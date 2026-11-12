import type { Perfil } from '../generated/prisma/enums';

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
