import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { empleadoGuard } from './guards/empleado-guard';
import { logueadoGuard } from './guards/logueado-guard';

// Todas las páginas se cargan con lazy loading (clase 2): el bundle de cada una
// se pide recién cuando se navega a su ruta. El comodín '**' va siempre último.
export const routes: Routes = [
  {
    // La página principal es la cartelera, sin login (R-02, R-05).
    path: '',
    title: 'Cartelera · Olympia Cinema',
    loadComponent: () => import('./pages/cartelera/cartelera').then((m) => m.Cartelera),
  },
  {
    // /login y /registro. Como auth.routes.ts tiene export default,
    // loadChildren no necesita el .then() (clase 5).
    path: '',
    loadChildren: () => import('./pages/auth.routes'),
  },
  // Páginas protegidas con guards funcionales (clase 5), uno por rol.
  {
    path: 'mi-cuenta',
    title: 'Mi cuenta · Olympia Cinema',
    canActivate: [logueadoGuard],
    loadComponent: () => import('./pages/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
  },
  {
    path: 'empleado',
    title: 'Validación · Olympia Cinema',
    canActivate: [empleadoGuard],
    loadComponent: () => import('./pages/empleado/empleado').then((m) => m.Empleado),
  },
  {
    // /admin y todas sus rutas hijas (admin.routes.ts). El guard va acá, en
    // el padre: se ejecuta antes de entrar a cualquiera de las hijas.
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./pages/admin.routes'),
  },
  {
    path: '**',
    title: 'Página no encontrada · Olympia Cinema',
    loadComponent: () =>
      import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
  },
];
