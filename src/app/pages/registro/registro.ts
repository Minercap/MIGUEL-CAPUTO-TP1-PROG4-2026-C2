import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

// Registro de clientes (R-01) con formulario reactivo (clase 4). Pide los
// datos que enumeró el cliente en el mail del 01/01.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  // Opciones de los select, recorridas con @for en el template.
  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  coloresOjos = ['Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro'];

  // Estado que lee el template: va en signals (D-03).
  error = signal<string | null>(null);
  enviando = signal(false);

  formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required, this.fechaNoFutura()]],
    tipo_sangre: ['', [Validators.required]],
    color_ojos: ['', [Validators.required]],
    dias_vacaciones: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(365), Validators.pattern(/^\d+$/)],
    ],
  });

  // Validador propio (clase 4): nadie puede haber nacido en el futuro.
  // El input date entrega 'AAAA-MM-DD'; con 'T00:00' se lee en hora local.
  fechaNoFutura(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      return new Date(control.value + 'T00:00') > new Date() ? { fechaFutura: true } : null;
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get email() {
    return this.formulario.get('email');
  }
  get password() {
    return this.formulario.get('password');
  }
  get nombre() {
    return this.formulario.get('nombre');
  }
  get apellido() {
    return this.formulario.get('apellido');
  }
  get fechaNacimiento() {
    return this.formulario.get('fecha_nacimiento');
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
    if (this.formulario.invalid) return;

    this.error.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();
    const mensaje = await this.auth.registrar({
      email: v.email ?? '',
      password: v.password ?? '',
      nombre: v.nombre ?? '',
      apellido: v.apellido ?? '',
      fecha_nacimiento: v.fecha_nacimiento ?? '',
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
