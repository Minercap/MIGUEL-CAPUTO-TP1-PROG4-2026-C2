import { Routes } from '@angular/router';

// Las dos páginas se cargan con lazy loading (clase 2): el bundle de cada una
// se pide recién cuando se navega a su ruta. El comodín '**' va siempre último.
export const routes: Routes = [
  {
    path: '',
    title: 'Olympia Cinema',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: '**',
    title: 'Página no encontrada · Olympia Cinema',
    loadComponent: () =>
      import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
  },
];
