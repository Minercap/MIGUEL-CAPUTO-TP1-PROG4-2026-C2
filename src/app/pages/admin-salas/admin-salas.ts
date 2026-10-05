import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Salas } from '../../services/salas';
import { Sala } from '../../interfaces/sala';

// Listado de salas del admin (R-34), con las acciones Editar y Borrar.
@Component({
  imports: [RouterLink],
  selector: 'app-admin-salas',
  styleUrl: './admin-salas.css',
  templateUrl: './admin-salas.html',
})
export class AdminSalas implements OnInit {
  private salasSrv = inject(Salas);

  // Estado que lee el template: va en signals (D-03).
  salas = signal<Sala[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Borrar pide confirmación en la misma fila: acá se guarda el id de la
  // sala que está esperando el "Sí, borrar". null = ninguna.
  idPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  async ngOnInit() {
    const resultado = await this.salasSrv.traerTodas();
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.salas.set(resultado.datos);
  }

  pedirConfirmacion(id: number) {
    this.error.set(null);
    this.idPorBorrar.set(id);
  }

  cancelarBorrado() {
    this.idPorBorrar.set(null);
  }

  async borrar(sala: Sala) {
    this.borrando.set(true);
    const resultado = await this.salasSrv.eliminar(sala);
    this.borrando.set(false);
    this.idPorBorrar.set(null);

    // Con hecho true y error, la sala se borró pero falló el log: se saca de
    // la lista igual y se muestra el aviso. Con hecho false no se borró (por
    // ejemplo, tiene funciones) y solo se muestra el mensaje.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      // Inmutable: se arma una lista nueva sin la sala borrada (clase 3).
      this.salas.update((prev) => prev.filter((s) => s.id !== sala.id));
    }
  }
}
