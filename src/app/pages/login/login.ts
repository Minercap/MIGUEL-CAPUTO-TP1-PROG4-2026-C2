import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { CuentaDePrueba } from '../../interfaces/cuenta-de-prueba';

// Cuentas de demostración para la evaluación: una por rol, para que la
// cátedra pueda entrar sin registrarse (corrección del 01/10, punto 2.2).
// Las contraseñas quedan a la vista en el código del front a propósito:
// son cuentas de prueba y su contraseña no se usa en ningún otro lado.
const CUENTAS_DE_PRUEBA: CuentaDePrueba[] = [
  { etiqueta: 'Admin', email: 'ubamjc@gmail.com', password: 'migue314' },
  { etiqueta: 'Empleado', email: 'miguelcaputo96@gmail.com', password: 'migue314' },
  { etiqueta: 'Cliente', email: 'roosariov@gmail.com', password: 'migue314' },
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
  private router = inject(Router);

  error = signal<string | null>(null);
  enviando = signal(false);

  // No es un signal porque la lista es fija: el template solo la recorre.
  cuentasDePrueba = CUENTAS_DE_PRUEBA;

  formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
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
    if (this.formulario.invalid) return;

    this.error.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();
    const mensaje = await this.auth.iniciarSesion(v.email ?? '', v.password ?? '');

    this.enviando.set(false);
    if (mensaje) {
      this.error.set(mensaje);
      return;
    }

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
