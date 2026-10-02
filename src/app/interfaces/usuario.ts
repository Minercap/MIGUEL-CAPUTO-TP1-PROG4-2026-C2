// Una fila de la tabla Usuarios (supabase/schema.sql). El id es el mismo
// uuid del usuario de Supabase Auth (clase 7).
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // 'AAAA-MM-DD', como la devuelve Postgres
  tipo_sangre: string; // not null desde la corrección del 01/10 (D-25)
  color_ojos: string;
  dias_vacaciones: number;
  rol: 'admin' | 'empleado' | 'cliente';
  puntos: number;
  credito: number;
  creado_en: string;
}

// Lo que se inserta en Usuarios al registrarse (interfaces por operación,
// clase 6). No lleva rol, puntos, credito ni creado_en: los pone la base
// con sus valores por defecto (rol 'cliente', 0 puntos, 0 de crédito).
export interface UsuarioPorCrear {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

// Los datos del formulario de registro: los del perfil más la contraseña,
// que va a Supabase Auth y nunca a la tabla.
export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}
