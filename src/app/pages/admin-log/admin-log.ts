import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FILAS_POR_PAGINA_LOG, LogActividad } from '../../services/log-actividad';
import { ACCIONES_LOG, AccionLog, RegistroLogParaMostrar } from '../../interfaces/log-actividad';

// Pantalla del log de actividad (R-38): quién hizo qué y cuándo. Solo la
// ve el admin (adminGuard en la ruta padre, y RLS en la base). Pide de a
// una página de 10 filas (D-61), con un filtro por acción.
@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-admin-log',
  styleUrl: './admin-log.css',
  templateUrl: './admin-log.html',
})
export class AdminLog implements OnInit {
  private logSrv = inject(LogActividad);

  // Las opciones del filtro. No es un signal porque nunca cambia.
  acciones = ACCIONES_LOG;

  // Estado que lee el template: va en signals (D-03).
  registros = signal<RegistroLogParaMostrar[]>([]);
  pagina = signal(1);
  totalPaginas = signal(1);
  accion = signal<AccionLog | null>(null); // null = todas
  cargando = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  // Al cambiar el filtro se vuelve a la página 1: la página en la que
  // estaba puede no existir con el filtro nuevo.
  async filtrar(evento: Event) {
    const valor = (evento.target as HTMLSelectElement).value;
    // Se acepta solo una de las acciones ofrecidas (validaciones.md,
    // principio 4); cualquier otra cosa es "Todas".
    const elegida = this.acciones.find((a) => a === valor) ?? null;
    this.accion.set(elegida);
    this.pagina.set(1);
    await this.cargar();
  }

  async anterior() {
    if (this.pagina() <= 1 || this.cargando()) return;
    this.pagina.update((p) => p - 1);
    await this.cargar();
  }

  async siguiente() {
    if (this.pagina() >= this.totalPaginas() || this.cargando()) return;
    this.pagina.update((p) => p + 1);
    await this.cargar();
  }

  private async cargar() {
    this.cargando.set(true);
    this.error.set(null);

    const resultado = await this.logSrv.traerPagina(this.pagina(), this.accion());
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      this.registros.set([]);
      this.cargando.set(false);
      return;
    }
    this.registros.set(resultado.datos.registros);
    // Sin filas igual hay una página, la vacía: así se lee "Página 1 de 1".
    this.totalPaginas.set(Math.max(1, Math.ceil(resultado.datos.total / FILAS_POR_PAGINA_LOG)));
    this.cargando.set(false);
  }
}
