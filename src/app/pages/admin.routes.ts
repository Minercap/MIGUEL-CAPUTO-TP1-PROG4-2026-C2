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
  {
    path: 'funciones',
    title: 'Funciones · Administración',
    loadComponent: () =>
      import('./admin-funciones/admin-funciones').then((m) => m.AdminFunciones),
  },
  {
    path: 'funciones/nueva',
    title: 'Nuevas funciones · Administración',
    loadComponent: () =>
      import('./admin-funcion-formulario/admin-funcion-formulario').then(
        (m) => m.AdminFuncionFormulario,
      ),
  },
  {
    path: 'funciones/:id',
    title: 'Editar función · Administración',
    loadComponent: () =>
      import('./admin-funcion-formulario/admin-funcion-formulario').then(
        (m) => m.AdminFuncionFormulario,
      ),
  },
  {
    path: 'productos',
    title: 'Candy bar · Administración',
    loadComponent: () =>
      import('./admin-productos/admin-productos').then((m) => m.AdminProductos),
  },
  // Mismo criterio que en películas: 'nuevo' antes que ':id'.
  {
    path: 'productos/nuevo',
    title: 'Nuevo producto · Administración',
    loadComponent: () =>
      import('./admin-producto-formulario/admin-producto-formulario').then(
        (m) => m.AdminProductoFormulario,
      ),
  },
  {
    path: 'productos/:id',
    title: 'Editar producto · Administración',
    loadComponent: () =>
      import('./admin-producto-formulario/admin-producto-formulario').then(
        (m) => m.AdminProductoFormulario,
      ),
  },
  {
    path: 'cupones',
    title: 'Cupones · Administración',
    loadComponent: () => import('./admin-cupones/admin-cupones').then((m) => m.AdminCupones),
  },
  {
    path: 'recompensas',
    title: 'Recompensas · Administración',
    loadComponent: () =>
      import('./admin-recompensas/admin-recompensas').then((m) => m.AdminRecompensas),
  },
];

export default rutas;
