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
  {
    path: 'peliculas',
    title: 'Películas · Administración',
    loadComponent: () =>
      import('./admin-peliculas/admin-peliculas').then((m) => m.AdminPeliculas),
  },
  // Alta y edición usan el mismo componente. 'nueva' va antes que ':id':
  // el router prueba las rutas en orden, y si ':id' fuera primero tomaría
  // la palabra "nueva" como si fuera un id.
  {
    path: 'peliculas/nueva',
    title: 'Nueva película · Administración',
    loadComponent: () =>
      import('./admin-pelicula-formulario/admin-pelicula-formulario').then(
        (m) => m.AdminPeliculaFormulario,
      ),
  },
  {
    path: 'peliculas/:id',
    title: 'Editar película · Administración',
    loadComponent: () =>
      import('./admin-pelicula-formulario/admin-pelicula-formulario').then(
        (m) => m.AdminPeliculaFormulario,
      ),
  },
  {
    path: 'salas',
    title: 'Salas · Administración',
    loadComponent: () => import('./admin-salas/admin-salas').then((m) => m.AdminSalas),
  },
  // Mismo criterio que en películas: 'nueva' antes que ':id'.
  {
    path: 'salas/nueva',
    title: 'Nueva sala · Administración',
    loadComponent: () =>
      import('./admin-sala-formulario/admin-sala-formulario').then((m) => m.AdminSalaFormulario),
  },
  {
    path: 'salas/:id',
    title: 'Editar sala · Administración',
    loadComponent: () =>
      import('./admin-sala-formulario/admin-sala-formulario').then((m) => m.AdminSalaFormulario),
  },
];

export default rutas;
