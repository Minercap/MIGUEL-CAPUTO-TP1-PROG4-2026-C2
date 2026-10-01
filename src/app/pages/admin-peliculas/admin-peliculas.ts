import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Peliculas } from '../../services/peliculas';
import { Pelicula } from '../../interfaces/pelicula';

// Listado de películas del admin (R-34), con las acciones Editar y Borrar.
@Component({
  imports: [RouterLink],
  selector: 'app-admin-peliculas',
  styleUrl: './admin-peliculas.css',
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  private peliculasSrv = inject(Peliculas);

  // Estado que lee el template: va en signals (D-03).
  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Borrar pide confirmación en la misma fila: acá se guarda el id de la
  // película que está esperando el "Sí, borrar". null = ninguna.
  idPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  async ngOnInit() {
    const resultado = await this.peliculasSrv.traerTodas();
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.peliculas.set(resultado.datos);
  }

  pedirConfirmacion(id: number) {
    this.error.set(null);
    this.idPorBorrar.set(id);
  }

  cancelarBorrado() {
    this.idPorBorrar.set(null);
  }

  async borrar(pelicula: Pelicula) {
    this.borrando.set(true);
    const resultado = await this.peliculasSrv.eliminar(pelicula);
    this.borrando.set(false);
    this.idPorBorrar.set(null);

    // Con hecho true y error, la película se borró pero falló el log: se
    // saca de la lista igual y se muestra el aviso. Con hecho false no se
    // borró (por ejemplo, tiene funciones) y solo se muestra el mensaje.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      // Inmutable: se arma una lista nueva sin la película borrada (clase 3).
      this.peliculas.update((prev) => prev.filter((p) => p.id !== pelicula.id));
    }
  }
}
