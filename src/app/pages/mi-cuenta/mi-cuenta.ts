import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth } from '../../services/auth';
import { Tickets } from '../../services/tickets';
import { Compras, canjesDeCompras, nombreDelMedio } from '../../services/compras';
import { CanjeDelHistorial, MiCompra } from '../../interfaces/compra';
import { ResumenCompra } from '../../components/resumen-compra/resumen-compra';
import { Entrada } from '../../components/entrada/entrada';

// Perfil del cliente (R-03): sus datos, sus puntos y su crédito, el
// historial de canjes y la lista de sus compras con el botón para cancelar
// (R-29, D-48). Cada compra no cancelada deja ver la entrada con el QR y
// descargar el PDF (R-20), con el mismo componente y el mismo PDF que la
// confirmación de la compra.
@Component({
  imports: [DatePipe, ResumenCompra, Entrada],
  selector: 'app-mi-cuenta',
  styleUrl: './mi-cuenta.css',
  templateUrl: './mi-cuenta.html',
})
export class MiCuenta implements OnInit {
  auth = inject(Auth);
  comprasSrv = inject(Compras);
  private tickets = inject(Tickets);

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
  // La compra con la entrada desplegada. null = ninguna: se ve una por vez.
  idEntradaAbierta = signal<number | null>(null);
  // La compra cuyo PDF se está generando, y el error del último PDF que
  // falló, con el id de su compra para mostrarlo en esa tarjeta.
  idDescargando = signal<number | null>(null);
  errorPdf = signal<{ id: number; mensaje: string } | null>(null);

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

  // El historial de canjes sale de las compras cargadas. Es un método y no
  // un signal aparte: al cancelar una compra, compras cambia y el canje
  // pasa solo a "Devuelto".
  canjes(): CanjeDelHistorial[] {
    return canjesDeCompras(this.compras());
  }

  // "Ver entrada" la despliega y "Ocultar entrada" la pliega. Abrir otra
  // cierra la anterior.
  alternarEntrada(id: number) {
    this.idEntradaAbierta.update((abierta) => (abierta === id ? null : id));
  }

  // El mismo PDF de la confirmación (D-37): Tickets arma el QR y el PDF.
  // Acá solo se le pasan la compra y su función, como hace Entrada.
  async descargarPdf(compra: MiCompra) {
    if (compra.datos === null || this.idDescargando() !== null) return;
    this.errorPdf.set(null);
    this.idDescargando.set(compra.id);

    // Sin QR el PDF sale igual, con el código escrito (R-32).
    const qr = await this.tickets.generarQr(compra.codigo);
    const error = this.tickets.descargarPdf(compra.datos, compra, qr.datos);

    this.idDescargando.set(null);
    if (error) this.errorPdf.set({ id: compra.id, mensaje: error });
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
    // Una compra cancelada no muestra la entrada.
    if (this.idEntradaAbierta() === compra.id) this.idEntradaAbierta.set(null);
    this.aviso.set(
      `Cancelaste la compra ${compra.codigo}. Se acreditaron $${resultado.datos.credito_acreditado} de crédito en tu cuenta.`,
    );
    // Los puntos y el crédito cambiaron en la base: se vuelve a leer el
    // perfil para mostrar los saldos nuevos.
    await this.auth.recargarPerfil();
  }
}
