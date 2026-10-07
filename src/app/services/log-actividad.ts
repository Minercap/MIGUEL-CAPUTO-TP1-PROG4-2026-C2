import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Auth } from './auth';
import {
  AccionLog,
  PaginaLog,
  RegistroLog,
  RegistroLogParaMostrar,
  RegistroLogPorCrear,
} from '../interfaces/log-actividad';
import { Usuario } from '../interfaces/usuario';
import { Resultado } from '../interfaces/resultado';

// Cuántas filas trae cada página de la pantalla del log (D-61).
export const FILAS_POR_PAGINA_LOG = 10;

// Log de actividad (R-38, decisión D-14). Cada servicio del admin llama a
// registrar() después de un alta, una edición o una baja que salió bien.
// La pantalla del admin lo lee de a una página con traerPagina().
// Se hace desde el front y no con triggers para que la lógica quede a la
// vista en el código de la app.
@Service()
export class LogActividad {
  private sup = inject(SupabaseService);
  private auth = inject(Auth);

  // Devuelve null si se registró, o el mensaje de error. No lo muestra él
  // mismo: lo devuelve para que llegue a la pantalla que hizo la acción.
  async registrar(
    accion: AccionLog,
    entidad: string,
    entidadId: number | string | null,
    detalle: string | null,
  ): Promise<string | null> {
    const fila: RegistroLogPorCrear = {
      // El "quién" sale de la sesión, no lo pasa quien llama: así ninguna
      // pantalla puede registrar una acción a nombre de otro.
      usuario_id: this.auth.usuarioActual()?.id ?? null,
      accion,
      entidad,
      // La columna es text porque hay tablas con id numérico y otras con uuid.
      entidad_id: entidadId === null ? null : String(entidadId),
      detalle,
    };

    const { error } = await this.sup.Sup.from('LogActividad').insert(fila);
    if (error) return 'No se pudo registrar la acción en el log de actividad.';
    return null;
  }

  // Una página del log, de la más nueva a la más vieja (D-61). La página
  // arranca en 1. accion null = todas las acciones.
  //
  // .range(desde, hasta) pide solo esas filas, contadas desde 0 y con las
  // dos puntas incluidas: la página 3 son las filas 20 a 29. Con
  // { count: 'exact' }, Supabase además cuenta cuántas filas cumplen el
  // filtro y lo devuelve en count. Para que las páginas no se mezclen, el
  // orden lo pone la base con .order(): sin eso, la fila 20 de un pedido
  // podría no ser la misma en el siguiente.
  async traerPagina(pagina: number, accion: AccionLog | null): Promise<Resultado<PaginaLog>> {
    const desde = (pagina - 1) * FILAS_POR_PAGINA_LOG;
    const hasta = desde + FILAS_POR_PAGINA_LOG - 1;

    let consulta = this.sup.Sup.from('LogActividad').select('*', { count: 'exact' });
    if (accion) consulta = consulta.eq('accion', accion);
    const { data, error, count } = await consulta
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .range(desde, hasta);
    if (error) return { datos: null, error: 'No se pudo cargar el log de actividad.' };
    const registros: RegistroLog[] = data;

    // Quién hizo cada acción: el mail, que está en Usuarios. Se piden solo
    // los usuarios de esta página, con .in() (D-57). El admin puede leer
    // Usuarios; si igual falla, se muestra el id corto y la página sigue.
    const ids = [...new Set(registros.map((r) => r.usuario_id).filter((id) => id !== null))];
    let usuarios: Usuario[] = [];
    if (ids.length > 0) {
      const { data: dUsuarios, error: errorUsuarios } = await this.sup.Sup.from('Usuarios')
        .select('*')
        .in('id', ids);
      if (!errorUsuarios) usuarios = dUsuarios;
    }

    const paraMostrar: RegistroLogParaMostrar[] = registros.map((registro) => ({
      ...registro,
      usuario: this.nombreDeUsuario(registro.usuario_id, usuarios),
    }));
    return { datos: { registros: paraMostrar, total: count ?? 0 }, error: null };
  }

  // El mail del usuario o, si no está entre los leídos, los primeros 8
  // caracteres del uuid: alcanzan para reconocerlo.
  private nombreDeUsuario(id: string | null, usuarios: Usuario[]): string {
    if (id === null) return 'Sin usuario';
    return usuarios.find((u) => u.id === id)?.email ?? id.slice(0, 8);
  }
}
