import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './services/auth';
import { Alertas } from './services/alertas';

// El App inyecta Auth para mostrar un menú distinto según haya sesión y
// según el rol (clase 5). Al inyectarlo acá, el servicio arranca con la app
// y onAuthStateChange empieza a escuchar desde el primer momento.
// RouterLinkActive es la directiva que marca en la barra el link de la
// página actual (D-66).
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  auth = inject(Auth);
  // El aviso de las alertas de Próximamente (R-10, D-52) se muestra acá,
  // arriba de cualquier página.
  alertas = inject(Alertas);
  private router = inject(Router);

  errorSesion = signal<string | null>(null);
  errorAviso = signal<string | null>(null);
  cerrandoAviso = signal(false);

  // Al abrir la app con una sesión guardada, se busca si hay algo para
  // avisarle al usuario. Se espera a auth.listo, que se cumple cuando
  // terminó de cargarse la sesión (D-13). El otro momento es el inicio de
  // sesión: ahí lo pide el Login.
  async ngOnInit() {
    await this.auth.listo;
    if (this.auth.usuarioActual()) await this.alertas.cargarAvisos();
  }

  // Cierra el aviso: las alertas mostradas quedan como notificadas.
  async cerrarAviso() {
    if (this.cerrandoAviso()) return;
    this.cerrandoAviso.set(true);
    const mensaje = await this.alertas.cerrarAvisos();
    this.cerrandoAviso.set(false);
    this.errorAviso.set(mensaje);
  }

  async cerrarSesion() {
    this.errorSesion.set(null);
    const mensaje = await this.auth.cerrarSesion();
    if (mensaje) {
      this.errorSesion.set(mensaje);
      return;
    }
    // El aviso era del usuario que se fue.
    this.alertas.limpiarAvisos();
    this.errorAviso.set(null);
    this.router.navigateByUrl('/');
  }
}
