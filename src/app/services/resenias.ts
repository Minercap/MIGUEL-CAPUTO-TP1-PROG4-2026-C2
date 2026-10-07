import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Auth } from './auth';
import { LogActividad } from './log-actividad';
import { PromedioResenias, Resenia, ReseniaPorCrear } from '../interfaces/resenia';
import { Resultado } from '../interfaces/resultado';

// Lo que devuelve crear(): como ResultadoAccion, más la reseña guardada,
// que la pantalla agrega a la lista sin volver a pedirla.
export interface ResultadoResenia {
  hecho: boolean;
  error: string | null;
  resenia: Resenia | null;
}

// Reseñas y promedio (R-08, R-09, D-59). Cualquiera las lee; las escribe
// un usuario con sesión, una por película. No se editan ni se borran.
@Service()
export class Resenias {
  private sup = inject(SupabaseService);
  private auth = inject(Auth);
  private log = inject(LogActividad);

  // Las reseñas de una película, de la más nueva a la más vieja.
  async traerDePelicula(peliculaId: number): Promise<Resultado<Resenia[]>> {
    const { data, error } = await this.sup.Sup.from('Resenias')
      .select('*')
      .eq('pelicula_id', peliculaId);
    if (error) return { datos: null, error: 'No se pudieron cargar las reseñas.' };

    const resenias: Resenia[] = data;
    // Postgres no garantiza ningún orden si no se le pide uno. Las fechas
    // ISO ordenadas como texto quedan ordenadas por fecha; b antes que a
    // deja primero la más nueva.
    resenias.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    return { datos: resenias, error: null };
  }

  // El promedio de cada película que tiene reseñas, para las tarjetas de
  // la cartelera y de Próximamente. Una sola consulta para todas: se
  // agrupan acá, en el front, como los reportes (D-55).
  async traerPromedios(): Promise<Resultado<PromedioResenias[]>> {
    const { data, error } = await this.sup.Sup.from('Resenias').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las calificaciones.' };

    const resenias: Resenia[] = data;
    return { datos: this.promediar(resenias), error: null };
  }

  // Agrupa las reseñas por película: suma las estrellas y cuenta cuántas
  // hay. El promedio es la suma sobre la cantidad. Es público para que lo
  // use también el detalle con las reseñas que ya trajo.
  promediar(resenias: Resenia[]): PromedioResenias[] {
    const sumas: { pelicula_id: number; suma: number; cantidad: number }[] = [];
    for (const resenia of resenias) {
      const grupo = sumas.find((s) => s.pelicula_id === resenia.pelicula_id);
      if (grupo) {
        grupo.suma += resenia.estrellas;
        grupo.cantidad++;
      } else {
        sumas.push({ pelicula_id: resenia.pelicula_id, suma: resenia.estrellas, cantidad: 1 });
      }
    }
    return sumas.map((s) => ({
      pelicula_id: s.pelicula_id,
      promedio: s.suma / s.cantidad,
      cantidad: s.cantidad,
    }));
  }

  // Guarda la reseña del usuario con sesión. El comentario llega ya
  // recortado; vacío se guarda como null (validaciones.md 3.9).
  async crear(
    peliculaId: number,
    estrellas: number,
    comentario: string,
  ): Promise<ResultadoResenia> {
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      return { hecho: false, error: 'Iniciá sesión para dejar tu reseña.', resenia: null };
    }

    const fila: ReseniaPorCrear = {
      usuario_id: usuario.id,
      pelicula_id: peliculaId,
      estrellas,
      comentario: comentario === '' ? null : comentario,
    };
    // Con .select().single() el insert devuelve la fila creada (D-18).
    const { data, error } = await this.sup.Sup.from('Resenias').insert(fila).select().single();
    if (error) {
      // 23505 es "violación de unique": la base ya tiene una reseña de este
      // usuario para esta película (D-59).
      const mensaje =
        error.code === '23505'
          ? 'Ya dejaste tu reseña de esta película.'
          : 'No se pudo guardar la reseña. Probá de nuevo.';
      return { hecho: false, error: mensaje, resenia: null };
    }
    const resenia: Resenia = data;

    const errorLog = await this.log.registrar(
      'crear',
      'Resenias',
      resenia.id,
      `Película ${peliculaId}: ${estrellas} estrellas`,
    );
    return { hecho: true, error: errorLog, resenia };
  }
}
