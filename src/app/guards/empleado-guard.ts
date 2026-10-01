import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Pasan el empleado y el admin, igual que es_empleado() en el SQL: el admin
// también puede hacer lo que hace un empleado. Async por D-13.
export const empleadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.listo;
  if (!auth.usuarioActual()) return router.navigateByUrl('/login');

  const rol = auth.perfil()?.rol;
  return rol === 'empleado' || rol === 'admin' ? true : router.navigateByUrl('/');
};
