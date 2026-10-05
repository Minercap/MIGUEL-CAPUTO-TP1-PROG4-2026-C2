import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Funciones } from '../../services/funciones';
import { FuncionConNombres } from '../../interfaces/funcion';

// Listado de funciones del admin (R-34), con las acciones Editar y Borrar.
@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-admin-funciones',
  styleUrl: './admin-funciones.css',
  templateUrl: './admin-funciones.html',
})
export class AdminFunciones implements OnInit {
  private funcionesSrv = inject(Funciones);

  // Estado que lee el template: va en signals (D-03).
  funciones = signal<FuncionConNombres[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Borrar pide confirmación en la misma fila: acá se guarda el id de la
  // función que está esperando el "Sí, borrar". null = ninguna.
  idPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  async ngOnInit() {
    const resultado = await this.funcionesSrv.traerTodas();
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.funciones.set(resultado.datos);
  }

  pedirConfirmacion(id: number) {
    this.error.set(null);
    this.idPorBorrar.set(id);
  }

  cancelarBorrado() {
    this.idPorBorrar.set(null);
  }

  async borrar(funcion: FuncionConNombres) {
    this.borrando.set(true);
    const resultado = await this.funcionesSrv.eliminar(funcion);
    this.borrando.set(false);
    this.idPorBorrar.set(null);

    // Con hecho true y error, la función se borró pero falló el log: se
    // saca de la lista igual y se muestra el aviso. Con hecho false no se
    // borró (por ejemplo, tiene entradas vendidas) y solo se muestra el
    // mensaje.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      // Inmutable: se arma una lista nueva sin la función borrada (clase 3).
      this.funciones.update((prev) => prev.filter((f) => f.id !== funcion.id));
    }
  }
}
