import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { CampoFecha } from '../../components/campo-fecha/campo-fecha';
import {
  camposIguales,
  email,
  entero,
  fechaATexto,
  fechaDesde,
  fechaHasta,
  fechaReal,
  hoy,
  largo,
  normalizarEmail,
  obligatorio,
  sumarAnios,
  textoPersona,
  unoDe,
} from '../../validadores/validadores';

// Registro de clientes (R-01) con formulario reactivo (clase 4). Pide los
// datos que enumeró el cliente en el mail del 01/01. Las reglas de cada
// campo son las de docs/validaciones.md, sección 3.1, y se repiten como
// constraints en la base (D-25).
@Component({
  imports: [ReactiveFormsModule, RouterLink, CampoFecha],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  // Opciones de los select, recorridas con @for en el template. Son las
  // mismas listas que tienen los check de la base: si se agrega una opción
  // acá, hay que agregarla en supabase/schema.sql.
  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  coloresOjos = ['Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro'];

  // Rango de la fecha de nacimiento: no futura y no más de 120 años atrás.
  // Con las mismas dos fechas se arma la lista de años del desplegable.
  private fechaMaxima = hoy();
  private fechaMinima = sumarAnios(this.fechaMaxima, -120);
  anioDesde = this.fechaMinima.getFullYear();
  anioHasta = this.fechaMaxima.getFullYear();

  // Estado que lee el template: va en signals (D-03).
  error = signal<string | null>(null);
  enviando = signal(false);

  formulario = this.fb.group(
    {
      email: ['', [obligatorio(), email()]],
      // La contraseña no se recorta ni se valida por contenido: de 8 a 72
      // caracteres, sin exigir mayúsculas ni símbolos (NIST SP 800-63B). 72
      // es el máximo que admite Supabase Auth.
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmar_password: ['', [Validators.required]],
      nombre: ['', [obligatorio(), largo(2, 50), textoPersona()]],
      apellido: ['', [obligatorio(), largo(2, 50), textoPersona()]],
      // Grupo anidado para el componente campo-fecha (D-23). Cada
      // desplegable es obligatorio, y las reglas que miran la fecha entera
      // van como validadores del grupo.
      fecha_nacimiento: this.fb.group(
        {
          dia: ['', [Validators.required]],
          mes: ['', [Validators.required]],
          anio: ['', [Validators.required]],
        },
        {
          validators: [fechaReal(), fechaHasta(this.fechaMaxima), fechaDesde(this.fechaMinima)],
        },
      ),
      tipo_sangre: ['', [Validators.required, unoDe(this.tiposSangre)]],
      color_ojos: ['', [Validators.required, unoDe(this.coloresOjos)]],
      dias_vacaciones: [null as number | null, [Validators.required, entero(0, 60)]],
    },
    // Validador del formulario entero, porque compara dos campos (D-17).
    { validators: [camposIguales('password', 'confirmar_password')] },
  );

  // Getters para leer cada campo desde el template (clase 4).
  get email() {
    return this.formulario.get('email');
  }
  get password() {
    return this.formulario.get('password');
  }
  get confirmarPassword() {
    return this.formulario.get('confirmar_password');
  }
  get nombre() {
    return this.formulario.get('nombre');
  }
  get apellido() {
    return this.formulario.get('apellido');
  }
  // Con .controls devuelve el FormGroup, que es lo que recibe campo-fecha.
  get fechaNacimiento() {
    return this.formulario.controls.fecha_nacimiento;
  }
  get tipoSangre() {
    return this.formulario.get('tipo_sangre');
  }
  get colorOjos() {
    return this.formulario.get('color_ojos');
  }
  get diasVacaciones() {
    return this.formulario.get('dias_vacaciones');
  }

  async registrar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.enviando()) return;

    this.error.set(null);
    this.enviando.set(true);

    // Se normaliza antes de enviar: los textos sin espacios en los extremos
    // y el mail en minúsculas. Es lo mismo que miraron los validadores.
    const v = this.formulario.getRawValue();
    const mensaje = await this.auth.registrar({
      email: normalizarEmail(v.email ?? ''),
      password: v.password ?? '',
      nombre: (v.nombre ?? '').trim(),
      apellido: (v.apellido ?? '').trim(),
      fecha_nacimiento: fechaATexto({
        dia: v.fecha_nacimiento.dia ?? '',
        mes: v.fecha_nacimiento.mes ?? '',
        anio: v.fecha_nacimiento.anio ?? '',
      }),
      tipo_sangre: v.tipo_sangre ?? '',
      color_ojos: v.color_ojos ?? '',
      dias_vacaciones: Number(v.dias_vacaciones),
    });

    this.enviando.set(false);
    if (mensaje) {
      this.error.set(mensaje);
      return;
    }
    // Quien se registra siempre es cliente: va a su cuenta.
    this.router.navigateByUrl('/mi-cuenta');
  }
}
