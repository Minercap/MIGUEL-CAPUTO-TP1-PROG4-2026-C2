import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { empleadoGuard } from './guards/empleado-guard';
import { logueadoGuard } from './guards/logueado-guard';

// Todas las páginas se cargan con lazy loading (clase 2): el bundle de cada una
// se pide recién cuando se navega a su ruta. El comodín '**' va siempre último.
export const routes: Routes = [
  {
    path: '',
    title: 'Olympia Cinema',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
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
    path: 'admin',
    title: 'Administración · Olympia Cinema',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  {
    path: '**',
    title: 'Página no encontrada · Olympia Cinema',
    loadComponent: () =>
      import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
  },
];
