import { Routes } from '@angular/router';

// Rutas de autenticación en su propio archivo, con export default, para
// cargarlas con loadChildren desde app.routes.ts (clases 2 y 5).
const rutas: Routes = [
  {
    path: 'login',
    title: 'Ingresar · Olympia Cinema',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Olympia Cinema',
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
];

export default rutas;
