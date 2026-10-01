import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

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
