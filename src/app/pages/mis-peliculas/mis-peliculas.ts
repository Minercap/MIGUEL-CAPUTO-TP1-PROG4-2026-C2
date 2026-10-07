import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { MisPeliculas as MisPeliculasSrv } from '../../services/mis-peliculas';
import { EstrellasPipe } from '../../pipes/estrellas-pipe';
import { PeliculaVista } from '../../interfaces/pelicula-vista';

// Mis películas (R-12): el historial visual de lo que vio el cliente, con
// el póster, la fecha de la función y su calificación. Qué cuenta como
// "vista" lo decide D-58.
// El servicio y la página se llaman igual, así que el servicio se importa
// con otro nombre, como en la cartelera.
@Component({
  imports: [RouterLink, DatePipe, EstrellasPipe],
  selector: 'app-mis-peliculas',
  styleUrl: './mis-peliculas.css',
  templateUrl: './mis-peliculas.html',
})
export class MisPeliculas implements OnInit {
  private auth = inject(Auth);
  private misPeliculasSrv = inject(MisPeliculasSrv);

  // Estado que lee el template: va en signals (D-03).
  vistas = signal<PeliculaVista[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    // El guard ya esperó la sesión (D-13): usuarioActual está cargado.
    const usuario = this.auth.usuarioActual();
    if (usuario === null) {
      this.cargando.set(false);
      return;
    }
    const resultado = await this.misPeliculasSrv.traerVistas(usuario.id);
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.vistas.set(resultado.datos);
  }
}
