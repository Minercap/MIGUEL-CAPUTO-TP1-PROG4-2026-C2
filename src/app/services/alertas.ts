import { Service, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { Auth } from './auth';
import { Compras } from './compras';
import { Alerta, AlertaPorCrear, AvisoDeVenta } from '../interfaces/alerta';
import { Pelicula } from '../interfaces/pelicula';
import { Resultado } from '../interfaces/resultado';

// Las alertas de Próximamente (R-10, D-52): el usuario pide que le avisen
// cuando salgan a la venta las entradas de una película.
//
// El aviso le llega de dos formas. Si aceptó las notificaciones, con un
// push que manda la Edge Function enviar-alertas. Si no, con un aviso
// dentro de la app, que arma este servicio. En los dos casos la alerta
// queda marcada como notificada, para no avisar dos veces.
@Service()
export class Alertas {
  private sup = inject(SupabaseService);
  private auth = inject(Auth);
  private compras = inject(Compras);

  // El aviso dentro de la app: las alertas del usuario, sin notificar,
  // cuya película ya está a la venta. Vive en el servicio y no en un
  // componente porque lo carga el Login y lo muestra el App. Son signals
  // porque los lee un template (D-03).
  avisos = signal<AvisoDeVenta[]>([]);
  errorAvisos = signal<string | null>(null);

  // La alerta del usuario con sesión sobre esa película, o null si no la
  // activó. RLS ya deja ver solo las propias; el filtro por usuario está
  // igual, porque el admin puede leer todas.
  async traerMia(peliculaId: number): Promise<Resultado<Alerta | null>> {
    const usuario = this.auth.usuarioActual();
    if (!usuario) return { datos: null, error: null };

    const { data, error } = await this.sup.Sup.from('Alertas')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('pelicula_id', peliculaId);
    if (error) return { datos: null, error: 'No se pudo consultar tu alerta.' };

    const alertas: Alerta[] = data;
    return { datos: alertas[0] ?? null, error: null };
  }

  // Activa la alerta del usuario con sesión sobre esa película.
  async activar(peliculaId: number): Promise<Resultado<Alerta>> {
    const usuario = this.auth.usuarioActual();
    if (!usuario) return { datos: null, error: 'Iniciá sesión para activar la alerta.' };

    const fila: AlertaPorCrear = { usuario_id: usuario.id, pelicula_id: peliculaId };
    // Con .select().single() el insert devuelve la fila creada (D-18).
    const { data, error } = await this.sup.Sup.from('Alertas').insert(fila).select().single();
    if (error) {
      // 23505 es "violación de unique": ya tenía una alerta sobre esta
      // película (por ejemplo, la activó en otra pestaña).
      const mensaje =
        error.code === '23505'
          ? 'Ya tenías activada la alerta de esta película.'
          : 'No se pudo activar la alerta. Probá de nuevo.';
      return { datos: null, error: mensaje };
    }

    const alerta: Alerta = data;
    return { datos: alerta, error: null };
  }

  // Busca qué hay para avisarle al usuario con sesión y lo deja en la
  // signal "avisos". Se llama al iniciar sesión y al abrir la app con una
  // sesión guardada. Sin sesión, deja la lista vacía.
  async cargarAvisos(): Promise<void> {
    this.errorAvisos.set(null);
    const usuario = this.auth.usuarioActual();
    if (!usuario) {
      this.avisos.set([]);
      return;
    }

    const { data, error } = await this.sup.Sup.from('Alertas')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('notificada', false);
    if (error) {
      this.errorAvisos.set('No se pudieron consultar tus alertas de Próximamente.');
      return;
    }
    const pendientes: Alerta[] = data;
    if (pendientes.length === 0) {
      this.avisos.set([]);
      return;
    }

    // Peliculas es una tabla pública y chica: se leen las visibles para
    // buscar el nombre y la fecha de cada una.
    const { data: dPeliculas, error: errorPeliculas } = await this.sup.Sup.from('Peliculas')
      .select('*')
      .eq('visible', true);
    if (errorPeliculas) {
      this.errorAvisos.set('No se pudieron consultar tus alertas de Próximamente.');
      return;
    }
    const peliculas: Pelicula[] = dPeliculas;

    // Se avisa solo de las películas cuya venta ya abrió. La regla es la
    // de la compra (D-39): está en Compras.ventaAbierta().
    const avisos: AvisoDeVenta[] = [];
    for (const alerta of pendientes) {
      const pelicula = peliculas.find((p) => p.id === alerta.pelicula_id);
      if (pelicula && this.compras.ventaAbierta(pelicula)) {
        avisos.push({
          alerta_id: alerta.id,
          pelicula_id: pelicula.id,
          pelicula_nombre: pelicula.nombre,
        });
      }
    }
    this.avisos.set(avisos);
  }

  // Al cerrar el aviso: las alertas mostradas quedan como notificadas y no
  // vuelven a aparecer. Devuelve null si salió bien, o el mensaje de error.
  //
  // .in() es "el id está en esta lista" (D-57): marca todas con un solo
  // update. El usuario solo puede escribir la columna notificada, y solo
  // en sus alertas (supabase/schema.sql, 15.2).
  async cerrarAvisos(): Promise<string | null> {
    const ids = this.avisos().map((aviso) => aviso.alerta_id);
    if (ids.length === 0) return null;

    const { error } = await this.sup.Sup.from('Alertas').update({ notificada: true }).in('id', ids);
    if (error) return 'No se pudo cerrar el aviso. Probá de nuevo.';

    this.avisos.set([]);
    return null;
  }

  // Vacía el aviso sin tocar la base. Se usa al cerrar sesión.
  limpiarAvisos() {
    this.avisos.set([]);
    this.errorAvisos.set(null);
  }
}
