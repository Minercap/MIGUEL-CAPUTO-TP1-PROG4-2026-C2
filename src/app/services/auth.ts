import { Service, inject, signal } from '@angular/core';
import { AuthError, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { DatosRegistro, Usuario, UsuarioPorCrear } from '../interfaces/usuario';

// Sesión y perfil del usuario (clases 5 y 7). Todo lo que se muestra en
// pantalla vive en signals (D-03). Los métodos devuelven null si salió bien
// o el mensaje de error para que el componente lo muestre.
@Service()
export class Auth {
  private sup = inject(SupabaseService);

  // El usuario de Supabase Auth (mail, id) y su fila de Usuarios (nombre, rol).
  usuarioActual = signal<User | null>(null);
  perfil = signal<Usuario | null>(null);

  // Error al leer el perfil. Esa lectura no la dispara ningún formulario,
  // así que el mensaje queda acá para que lo muestre el App.
  errorPerfil = signal<string | null>(null);

  // Se resuelve cuando termina la primera carga de sesión y perfil. Los
  // guards la esperan antes de decidir (D-13).
  listo: Promise<void>;

  constructor() {
    this.listo = new Promise((resolver) => {
      // onAuthStateChange avisa al arrancar (con la sesión guardada, si hay)
      // y en cada login y logout. El callback es sincrónico: la versión async
      // está deprecada en supabase-js porque puede trabarse. Por eso la
      // lectura del perfil se lanza con .then() y no con await.
      // Llamar a resolver() más de una vez no hace nada: solo cuenta la primera.
      this.sup.Auth.onAuthStateChange((_evento, sesion) => {
        const usuario = sesion?.user ?? null;
        this.usuarioActual.set(usuario);

        if (!usuario) {
          this.perfil.set(null);
          resolver();
        } else if (this.perfil()?.id !== usuario.id) {
          this.cargarPerfil(usuario.id).then(() => resolver());
        } else {
          // Mismo usuario (por ejemplo, se renovó el token): el perfil ya está.
          resolver();
        }
      });
    });
  }

  async registrar(datos: DatosRegistro): Promise<string | null> {
    const { data, error } = await this.sup.Auth.signUp({
      email: datos.email,
      password: datos.password,
    });
    if (error) return this.traducirError(error);
    if (!data.user) return 'No se pudo crear la cuenta. Probá de nuevo.';

    // La fila de Usuarios lleva el mismo id que el usuario de auth (clase 7).
    const fila: UsuarioPorCrear = {
      id: data.user.id,
      email: datos.email,
      nombre: datos.nombre,
      apellido: datos.apellido,
      fecha_nacimiento: datos.fecha_nacimiento,
      tipo_sangre: datos.tipo_sangre,
      color_ojos: datos.color_ojos,
      dias_vacaciones: datos.dias_vacaciones,
    };
    const { error: errorFila } = await this.sup.Sup.from('Usuarios').insert(fila);
    if (errorFila) {
      return 'La cuenta se creó, pero no se pudieron guardar tus datos. Probá de nuevo más tarde.';
    }

    // onAuthStateChange ya intentó leer el perfil apenas se creó la sesión,
    // antes de este insert, y no lo encontró. Se vuelve a leer ahora.
    await this.cargarPerfil(data.user.id);
    return null;
  }

  async iniciarSesion(email: string, password: string): Promise<string | null> {
    const { data, error } = await this.sup.Auth.signInWithPassword({ email, password });
    if (error) return this.traducirError(error);

    // Se espera el perfil acá para que, al volver, el Login ya conozca el
    // rol y pueda redirigir a la página que corresponde.
    await this.cargarPerfil(data.user.id);
    return null;
  }

  async cerrarSesion(): Promise<string | null> {
    const { error } = await this.sup.Auth.signOut();
    if (error) return this.traducirError(error);
    return null;
  }

  // Vuelve a leer el perfil del usuario con sesión. Lo usan la compra y la
  // cancelación, que cambian los puntos y el crédito en la base (D-47,
  // D-48). Si falla, el mensaje queda en errorPerfil, como en la carga.
  async recargarPerfil(): Promise<void> {
    const usuario = this.usuarioActual();
    if (usuario) await this.cargarPerfil(usuario.id);
  }

  // Lee la fila de Usuarios, que es donde está el rol (clase 7 y D-12).
  // Va sin .single(): si la fila todavía no existe (justo después del
  // signUp) vuelve una lista vacía en lugar de un error.
  private async cargarPerfil(id: string): Promise<void> {
    const { data, error } = await this.sup.Sup.from('Usuarios').select('*').eq('id', id);
    if (error) {
      this.perfil.set(null);
      this.errorPerfil.set('No se pudo cargar tu perfil. Probá recargar la página.');
      return;
    }
    const filas: Usuario[] = data;
    this.perfil.set(filas[0] ?? null);
    this.errorPerfil.set(null);
  }

  // Supabase devuelve los errores en inglés. Se traducen los que puede
  // provocar el usuario; el resto cae en un mensaje genérico.
  private traducirError(error: AuthError): string {
    switch (error.code) {
      case 'invalid_credentials':
        return 'El mail o la contraseña no son correctos.';
      case 'user_already_exists':
      case 'email_exists':
        return 'Ya existe una cuenta con ese mail.';
      case 'weak_password':
        return 'La contraseña es muy débil: usá al menos 8 caracteres.';
      case 'email_address_invalid':
        return 'El mail no es válido.';
      case 'email_not_confirmed':
        return 'Tenés que confirmar tu mail antes de ingresar.';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return 'Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.';
      default:
        return 'Ocurrió un error inesperado. Probá de nuevo.';
    }
  }
}
