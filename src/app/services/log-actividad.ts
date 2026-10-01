import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Auth } from './auth';
import { AccionLog, RegistroLogPorCrear } from '../interfaces/log-actividad';

// Log de actividad (R-38, decisión D-14). Cada servicio del admin llama a
// registrar() después de un alta, una edición o una baja que salió bien.
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
}
