import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// El logueadoGuard de la clase 5, pero async (D-13): antes de decidir espera
// a que Auth termine de restaurar la sesión, para que recargar la página no
// mande al login a alguien que tiene sesión.
export const logueadoGuard: CanActivateFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.listo;
  return auth.usuarioActual() ? true : router.navigateByUrl('/login');
};
