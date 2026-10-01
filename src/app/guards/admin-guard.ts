import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Igual que logueadoGuard, con chequeo de rol: solo pasa el admin. El rol
// sale de la tabla Usuarios (D-12). Async por D-13.
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.listo;
  if (!auth.usuarioActual()) return router.navigateByUrl('/login');
  return auth.perfil()?.rol === 'admin' ? true : router.navigateByUrl('/');
};
