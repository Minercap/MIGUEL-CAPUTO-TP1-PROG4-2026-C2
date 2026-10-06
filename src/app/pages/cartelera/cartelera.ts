import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Cartelera as CarteleraSrv } from '../../services/cartelera';
import { PeliculaDeCartelera } from '../../interfaces/cartelera';
import { Genero, Pelicula } from '../../interfaces/pelicula';

// Página principal (R-05): la cartelera, sin login. Arriba las 3 más
// vendidas (R-06) y abajo todas las películas en cartelera, con buscador
// por nombre y filtro por género (R-07).
// El servicio y la página se llaman igual, así que el servicio se importa
// con otro nombre (CarteleraSrv).
@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-cartelera',
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera implements OnInit {
  private carteleraSrv = inject(CarteleraSrv);

  // Estado que lee el template: va en signals (D-03).
  cargando = signal(true);
  error = signal<string | null>(null); // no se pudo cargar la cartelera
  errorMasVendidas = signal<string | null>(null); // falló solo ese bloque

  // Todas las películas en cartelera, tal como llegaron. No cambia más.
  peliculas = signal<PeliculaDeCartelera[]>([]);
  // Las que pasan el buscador y los géneros elegidos: es lo que dibuja la
  // grilla. La escribe filtrar() (D-32).
  filtradas = signal<PeliculaDeCartelera[]>([]);
  masVendidas = signal<PeliculaDeCartelera[]>([]);

  // Los géneros que se ofrecen como botones: solo los que tiene alguna
  // película en cartelera, para no mostrar botones que no encuentran nada.
  generos = signal<Genero[]>([]);
  // Lo que eligió el usuario: el texto del buscador y los ids de los
  // géneros prendidos.
  texto = signal('');
  generosElegidos = signal<number[]>([]);

  // Próximamente (R-10): las visibles con estreno futuro. Es un bloque
  // aparte, con su propio error, igual que las más vendidas.
  proximamente = signal<Pelicula[]>([]);
  errorProximamente = signal<string | null>(null);

  async ngOnInit() {
    // Próximamente se carga primero y por separado: se muestra aunque no
    // haya ninguna película en cartelera, o aunque la cartelera falle.
    const proximas = await this.carteleraSrv.traerProximamente();
    if (proximas.error || !proximas.datos) {
      this.errorProximamente.set(proximas.error);
    } else {
      this.proximamente.set(proximas.datos);
    }

    const resultado = await this.carteleraSrv.traerCartelera();
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    const cartelera = resultado.datos;
    this.peliculas.set(cartelera);
    this.filtradas.set(cartelera);
    this.generos.set(this.generosDe(cartelera));

    // Si fallan las más vendidas, la cartelera se muestra igual: se avisa
    // en ese bloque y nada más.
    const masVendidas = await this.carteleraSrv.traerMasVendidas(cartelera);
    if (masVendidas.error || !masVendidas.datos) {
      this.errorMasVendidas.set(masVendidas.error);
    } else {
      this.masVendidas.set(masVendidas.datos);
    }

    this.cargando.set(false);
  }

  // Se ejecuta con cada tecla en el buscador. El texto se toma del evento,
  // igual que el archivo en la clase 7.
  buscar(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.texto.set(input.value);
    this.filtrar();
  }

  // Prende el género si estaba apagado y lo apaga si estaba prendido.
  // La lista se reemplaza por una nueva, sin push (clase 3).
  alternarGenero(id: number) {
    this.generosElegidos.update((prev) =>
      prev.includes(id) ? prev.filter((elegido) => elegido !== id) : [...prev, id],
    );
    this.filtrar();
  }

  limpiar() {
    this.texto.set('');
    this.generosElegidos.set([]);
    this.filtrar();
  }

  // Recalcula la grilla (D-32). No va a la base: recorre las películas que
  // ya están en memoria y deja en "filtradas" las que cumplen las dos
  // condiciones:
  //   - su nombre contiene el texto buscado;
  //   - tiene TODOS los géneros elegidos (every), no alguno.
  // Con el buscador vacío y sin géneros, pasan todas.
  filtrar() {
    const buscado = this.normalizar(this.texto());
    const elegidos = this.generosElegidos();

    this.filtradas.set(
      this.peliculas().filter(
        (pelicula) =>
          this.normalizar(pelicula.nombre).includes(buscado) &&
          elegidos.every((id) => pelicula.generos.some((genero) => genero.id === id)),
      ),
    );
  }

  // Deja un texto listo para comparar sin que importen las mayúsculas ni
  // los acentos: "Acción" y "accion" quedan iguales.
  //   normalize('NFD') separa cada letra acentuada en dos caracteres: la
  //   letra sola y el acento. El replace borra los acentos, que son los
  //   caracteres del rango ̀ a ͯ.
  private normalizar(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  // Los géneros de las películas recibidas, sin repetir y por nombre.
  private generosDe(peliculas: PeliculaDeCartelera[]): Genero[] {
    const lista: Genero[] = [];
    for (const pelicula of peliculas) {
      for (const genero of pelicula.generos) {
        if (!lista.some((g) => g.id === genero.id)) lista.push(genero);
      }
    }
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return lista;
  }
}
