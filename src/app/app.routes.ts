import { Routes } from '@angular/router';

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
  {
    path: '**',
    title: 'Página no encontrada · Olympia Cinema',
    loadComponent: () =>
      import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
  },
];
