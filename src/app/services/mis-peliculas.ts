import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { CompraGuardada, EntradaGuardada } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { PeliculaVista } from '../interfaces/pelicula-vista';
import { Resenia } from '../interfaces/resenia';
import { Resultado } from '../interfaces/resultado';

// Arma las tarjetas de Mis películas con los datos ya leídos. Es una
// función suelta, sin Supabase, para poder probarla con datos fijos.
// "ahora" llega en milisegundos, como en agruparMasVistas (reportes.ts).
//
// La regla es D-58, la misma del reporte de más vistas (D-56): cuenta la
// función de una compra no cancelada que ya empezó. Una función aparece una
// sola vez aunque el cliente la haya comprado en dos compras.
export function armarMisPeliculas(
  compras: CompraGuardada[],
  entradas: EntradaGuardada[],
  funciones: Funcion[],
  peliculas: Pelicula[],
  resenias: Resenia[],
  ahora: number,
): PeliculaVista[] {
  const vistas: PeliculaVista[] = [];

  for (const entrada of entradas) {
    const compra = compras.find((c) => c.id === entrada.compra_id);
    if (!compra || compra.estado === 'cancelada') continue;
    if (vistas.some((v) => v.funcion_id === entrada.funcion_id)) continue;

    const funcion = funciones.find((f) => f.id === entrada.funcion_id);
    if (!funcion || new Date(funcion.fecha_hora).getTime() > ahora) continue;
    const pelicula = peliculas.find((p) => p.id === funcion.pelicula_id);
    if (!pelicula) continue;

    const resenia = resenias.find((r) => r.pelicula_id === pelicula.id);
    vistas.push({
      funcion_id: funcion.id,
      pelicula_id: pelicula.id,
      nombre: pelicula.nombre,
      imagen_url: pelicula.imagen_url,
      fecha_hora: funcion.fecha_hora,
      estrellas: resenia?.estrellas ?? null,
    });
  }

  // La más reciente primero. Las fechas de Postgres se comparan bien como
  // texto: van de año a segundo.
  vistas.sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
  return vistas;
}

// Mis películas (R-12): el historial de lo que el cliente vio.
@Service()
export class MisPeliculas {
  private sup = inject(SupabaseService);

  // Cinco consultas en cadena, como los reportes (D-57): las compras del
  // usuario, sus entradas, las funciones y películas de esas entradas, y
  // sus reseñas. Cada una pide solo lo que necesita con .eq() o .in().
  async traerVistas(usuarioId: string): Promise<Resultado<PeliculaVista[]>> {
    const error = 'No se pudieron cargar tus películas.';

    const { data: dCompras, error: e1 } = await this.sup.Sup.from('Compras')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('estado', 'pagada');
    if (e1) return { datos: null, error };
    const compras: CompraGuardada[] = dCompras;
    if (compras.length === 0) return { datos: [], error: null };

    const idsCompras = compras.map((c) => c.id);
    const { data: dEntradas, error: e2 } = await this.sup.Sup.from('Entradas')
      .select('*')
      .in('compra_id', idsCompras);
    if (e2) return { datos: null, error };
    const entradas: EntradaGuardada[] = dEntradas;

    const idsFunciones = [...new Set(entradas.map((e) => e.funcion_id))];
    const { data: dFunciones, error: e3 } = await this.sup.Sup.from('Funciones')
      .select('*')
      .in('id', idsFunciones);
    if (e3) return { datos: null, error };
    const funciones: Funcion[] = dFunciones;

    const idsPeliculas = [...new Set(funciones.map((f) => f.pelicula_id))];
    const { data: dPeliculas, error: e4 } = await this.sup.Sup.from('Peliculas')
      .select('*')
      .in('id', idsPeliculas);
    if (e4) return { datos: null, error };
    const peliculas: Pelicula[] = dPeliculas;

    const { data: dResenias, error: e5 } = await this.sup.Sup.from('Resenias')
      .select('*')
      .eq('usuario_id', usuarioId);
    if (e5) return { datos: null, error };
    const resenias: Resenia[] = dResenias;

    return {
      datos: armarMisPeliculas(compras, entradas, funciones, peliculas, resenias, Date.now()),
      error: null,
    };
  }
}
