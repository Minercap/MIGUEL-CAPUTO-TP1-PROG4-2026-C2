import { Routes } from '@angular/router';

// Rutas del panel de administración en su propio archivo, con export
// default, para cargarlas con loadChildren desde app.routes.ts (clases 2 y
// 5). El adminGuard está en la ruta padre ('admin'), así que protege a todas.
const rutas: Routes = [
  {
    path: '',
    title: 'Administración · Olympia Cinema',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
  },
];

export default rutas;
