import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Solo pasa el empleado, igual que es_empleado() en el SQL. El admin no
// valida entradas ni entrega candy: son roles separados (D-24).
// Async por D-13.
export const empleadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.listo;
  if (!auth.usuarioActual()) return router.navigateByUrl('/login');
  return auth.perfil()?.rol === 'empleado' ? true : router.navigateByUrl('/');
};
