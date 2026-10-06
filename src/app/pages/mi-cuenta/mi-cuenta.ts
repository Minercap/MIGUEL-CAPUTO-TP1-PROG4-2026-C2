import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth } from '../../services/auth';
import { Compras, nombreDelMedio } from '../../services/compras';
import { MiCompra } from '../../interfaces/compra';
import { ResumenCompra } from '../../components/resumen-compra/resumen-compra';

// Perfil del cliente (R-03): sus datos, sus puntos y su crédito, y la lista
// de sus compras con el botón para cancelar (R-29, D-48).
@Component({
  imports: [DatePipe, ResumenCompra],
  selector: 'app-mi-cuenta',
  styleUrl: './mi-cuenta.css',
  templateUrl: './mi-cuenta.html',
})
export class MiCuenta implements OnInit {
  auth = inject(Auth);
  comprasSrv = inject(Compras);

  // "Tarjeta de crédito" en lugar de 'credito', para que no se confunda con
  // el crédito del cine.
  nombreDelMedio = nombreDelMedio;

  // Estado que lee el template: va en signals (D-03).
  compras = signal<MiCompra[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  // Cancelar pide confirmación en la misma compra, como los borrados del
  // panel: acá va el id de la que espera el "Sí, cancelar". null = ninguna.
  idPorCancelar = signal<number | null>(null);
  cancelando = signal(false);
  // Lo que pasó con la última cancelación: el crédito acreditado.
  aviso = signal<string | null>(null);

  async ngOnInit() {
    // El guard ya esperó la sesión (D-13): usuarioActual está cargado.
    const usuario = this.auth.usuarioActual();
    if (usuario === null) {
      this.cargando.set(false);
      return;
    }
    const resultado = await this.comprasSrv.traerMisCompras(usuario.id);
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.compras.set(resultado.datos);
  }

  pedirConfirmacion(id: number) {
    this.error.set(null);
    this.aviso.set(null);
    this.idPorCancelar.set(id);
  }

  noCancelar() {
    this.idPorCancelar.set(null);
  }

  async cancelar(compra: MiCompra) {
    if (this.cancelando()) return;
    this.cancelando.set(true);
    const resultado = await this.comprasSrv.cancelarCompra(compra.id);
    this.cancelando.set(false);
    this.idPorCancelar.set(null);

    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }

    // Inmutable: una lista nueva con la compra marcada como cancelada
    // (clase 3).
    this.compras.update((prev) =>
      prev.map((c) => (c.id === compra.id ? { ...c, estado: 'cancelada' } : c)),
    );
    this.aviso.set(
      `Cancelaste la compra ${compra.codigo}. Se acreditaron $${resultado.datos.credito_acreditado} de crédito en tu cuenta.`,
    );
    // Los puntos y el crédito cambiaron en la base: se vuelve a leer el
    // perfil para mostrar los saldos nuevos.
    await this.auth.recargarPerfil();
  }
}
