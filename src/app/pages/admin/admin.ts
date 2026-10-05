import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Un acceso del panel. Si ruta es null, la sección todavía no está hecha
// y se muestra deshabilitada.
interface AccesoAdmin {
  nombre: string;
  descripcion: string;
  ruta: string | null;
}

// Panel de administración (R-34): la puerta de entrada a cada sección.
@Component({
  imports: [RouterLink],
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {
  // Lista fija, recorrida con @for en el template. No es un signal porque
  // nunca cambia mientras la pantalla está abierta.
  accesos: AccesoAdmin[] = [
    { nombre: 'Películas', descripcion: 'Cartelera, próximamente y preventa', ruta: '/admin/peliculas' },
    { nombre: 'Salas', descripcion: 'Las salas del cine', ruta: '/admin/salas' },
    { nombre: 'Funciones', descripcion: 'Horarios, formatos y precios', ruta: '/admin/funciones' },
    { nombre: 'Candy', descripcion: 'Productos y combos', ruta: '/admin/productos' },
    { nombre: 'Cupones', descripcion: 'Descuentos y condiciones', ruta: '/admin/cupones' },
    { nombre: 'Recompensas', descripcion: 'Canje de puntos', ruta: '/admin/recompensas' },
    { nombre: 'Reportes', descripcion: 'Facturación y más vendidos', ruta: null },
    { nombre: 'Log', descripcion: 'Quién hizo qué y cuándo', ruta: null },
  ];
}
