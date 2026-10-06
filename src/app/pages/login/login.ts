import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Alertas } from '../../services/alertas';
import { CuentaDePrueba } from '../../interfaces/cuenta-de-prueba';
import { email, normalizarEmail, obligatorio } from '../../validadores/validadores';

// Cuentas de demostración para la evaluación: una por rol, para que la
// cátedra pueda entrar sin registrarse (corrección del 01/10, punto 2.2).
// Las contraseñas quedan a la vista en el código del front a propósito:
// son cuentas de prueba y su contraseña no se usa en ningún otro lado.
const CUENTAS_DE_PRUEBA: CuentaDePrueba[] = [
  { etiqueta: 'Admin', email: 'admin@olympia.test', password: 'Olympia2026!' },
  { etiqueta: 'Empleado', email: 'empleado@olympia.test', password: 'Olympia2026!' },
  { etiqueta: 'Cliente', email: 'cliente@olympia.test', password: 'Olympia2026!' },
];

// Inicio de sesión con formulario reactivo (clase 4) y Supabase Auth (clase 5).
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private alertas = inject(Alertas);
  private router = inject(Router);

  error = signal<string | null>(null);
  enviando = signal(false);

  // No es un signal porque la lista es fija: el template solo la recorre.
  cuentasDePrueba = CUENTAS_DE_PRUEBA;

  formulario = this.fb.group({
    email: ['', [obligatorio(), email()]],
    // Sin mínimo de largo (docs/validaciones.md, 3.2): si la contraseña está
    // mal, el mensaje es siempre el mismo y no da pistas de por qué.
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  get email() {
    return this.formulario.get('email');
  }
  get password() {
    return this.formulario.get('password');
  }

  // Acceso rápido: completa el mail y la contraseña de una cuenta de
  // prueba. No envía el formulario: para entrar hay que tocar "Ingresar".
  completar(cuenta: CuentaDePrueba) {
    this.error.set(null);
    this.formulario.patchValue({ email: cuenta.email, password: cuenta.password });
  }

  async iniciarSesion() {
    if (this.formulario.invalid || this.enviando()) return;

    this.error.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();
    const mensaje = await this.auth.iniciarSesion(normalizarEmail(v.email ?? ''), v.password ?? '');

    this.enviando.set(false);
    if (mensaje) {
      this.error.set(mensaje);
      return;
    }

    // Con la sesión recién iniciada, se busca si hay alertas de
    // Próximamente para avisarle (D-52). El aviso lo muestra el App.
    await this.alertas.cargarAvisos();

    // La redirección se hace acá y no en onAuthStateChange, porque ese
    // evento también se dispara al recargar y sacaría al usuario de la
    // página en la que estaba. Cada rol va a su página.
    switch (this.auth.perfil()?.rol) {
      case 'admin':
        this.router.navigateByUrl('/admin');
        break;
      case 'empleado':
        this.router.navigateByUrl('/empleado');
        break;
      default:
        this.router.navigateByUrl('/mi-cuenta');
    }
  }
}
