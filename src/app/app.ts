import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './services/auth';

// El App inyecta Auth para mostrar un menú distinto según haya sesión y
// según el rol (clase 5). Al inyectarlo acá, el servicio arranca con la app
// y onAuthStateChange empieza a escuchar desde el primer momento.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  auth = inject(Auth);
  private router = inject(Router);

  errorSesion = signal<string | null>(null);

  async cerrarSesion() {
    this.errorSesion.set(null);
    const mensaje = await this.auth.cerrarSesion();
    if (mensaje) {
      this.errorSesion.set(mensaje);
      return;
    }
    this.router.navigateByUrl('/');
  }
}
