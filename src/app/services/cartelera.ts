import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { PeliculaDeCartelera, PeliculaMasVendida } from '../interfaces/cartelera';
import { Genero, Pelicula, PeliculaGenero } from '../interfaces/pelicula';
import { Resultado } from '../interfaces/resultado';
import { yaSeEstreno } from '../validadores/validadores';

// Cuántas películas lleva el bloque "Las más vendidas" (R-06).
const CANTIDAD_MAS_VENDIDAS = 3;

// Lo que ve el público, con o sin sesión (R-02): la cartelera y las más
// vendidas. Son solo lecturas, con el select de la clase 6. Ningún método
// muestra nada: todos devuelven el error ya traducido para la pantalla.
@Service()
export class Cartelera {
  private sup = inject(SupabaseService);

  // Las películas en cartelera, cada una con sus géneros. Son tres
  // consultas en lugar de un select anidado (D-16): las películas, la lista
  // de géneros y la tabla intermedia que las une.
  async traerCartelera(): Promise<Resultado<PeliculaDeCartelera[]>> {
    const { data, error } = await this.sup.Sup.from('Peliculas').select('*').eq('visible', true);
    if (error) return { datos: null, error: 'No se pudo cargar la cartelera.' };
    const visibles: Pelicula[] = data;

    const { data: dataGeneros, error: errorGeneros } = await this.sup.Sup.from('Generos').select(
      '*',
    );
    if (errorGeneros) return { datos: null, error: 'No se pudieron cargar los géneros.' };
    const generos: Genero[] = dataGeneros;

    const { data: dataUniones, error: errorUniones } = await this.sup.Sup.from(
      'PeliculasGeneros',
    ).select('*');
    if (errorUniones) {
      return { datos: null, error: 'No se pudieron cargar los géneros de las películas.' };
    }
    const uniones: PeliculaGenero[] = dataUniones;

    // En cartelera = visible y ya estrenada. Una visible con estreno futuro
    // va a Próximamente, no acá. Es el mismo criterio del pipe de estado
    // (D-27): los dos usan yaSeEstreno().
    const enCartelera = visibles.filter((pelicula) => yaSeEstreno(pelicula.fecha_estreno));

    const peliculas: PeliculaDeCartelera[] = enCartelera.map((pelicula) => {
      // Las filas de la tabla intermedia de esta película, y de cada una el
      // género completo, para tener su nombre.
      const suyos: Genero[] = [];
      for (const union of uniones) {
        if (union.pelicula_id !== pelicula.id) continue;
        const genero = generos.find((g) => g.id === union.genero_id);
        if (genero) suyos.push(genero);
      }
      suyos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      return { ...pelicula, generos: suyos };
    });

    // Postgres no garantiza ningún orden si no se le pide uno.
    peliculas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { datos: peliculas, error: null };
  }

  // Las 3 más vendidas (R-06, D-31), en orden: la primera es la que más
  // vendió. Recibe la cartelera ya cargada porque solo cuentan las
  // películas que hoy están en cartelera, y para no volver a pedirlas.
  async traerMasVendidas(cartelera: PeliculaDeCartelera[]): Promise<Resultado<PeliculaDeCartelera[]>> {
    // La vista se lee como una tabla. Devuelve una fila por película con
    // ventas: su id y cuántas entradas de compras pagadas tiene.
    const { data, error } = await this.sup.Sup.from('PeliculasMasVendidas').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las películas más vendidas.' };
    const ventas: PeliculaMasVendida[] = data;

    // De la que más vendió a la que menos.
    ventas.sort((a, b) => b.entradas_vendidas - a.entradas_vendidas);

    const masVendidas: PeliculaDeCartelera[] = [];
    for (const venta of ventas) {
      if (masVendidas.length === CANTIDAD_MAS_VENDIDAS) break;
      // Una película con ventas que ya no está en cartelera no se encuentra
      // acá, y se saltea.
      const pelicula = cartelera.find((p) => p.id === venta.pelicula_id);
      if (pelicula) masVendidas.push(pelicula);
    }

    // Si hay menos de 3 con ventas, se completa con los estrenos más
    // recientes en cartelera que todavía no estén en la lista. La fecha
    // llega como 'AAAA-MM-DD', así que ordenada como texto queda ordenada
    // por fecha. Se ordena una copia ([...]) para no desordenar la
    // cartelera que usa la pantalla.
    const porEstreno = [...cartelera].sort((a, b) => b.fecha_estreno.localeCompare(a.fecha_estreno));
    for (const pelicula of porEstreno) {
      if (masVendidas.length === CANTIDAD_MAS_VENDIDAS) break;
      if (!masVendidas.some((p) => p.id === pelicula.id)) masVendidas.push(pelicula);
    }

    return { datos: masVendidas, error: null };
  }
}
