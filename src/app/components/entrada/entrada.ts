import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LEYENDA_ADULTO, Tickets } from '../../services/tickets';
import { nombreDelMedio } from '../../services/compras';
import { CompraConfirmada, FuncionParaComprar } from '../../interfaces/compra';
import { ResumenCompra } from '../resumen-compra/resumen-compra';

// La entrada que ve el comprador cuando la compra salió bien (R-20): el QR
// con el código, los datos de la función, el detalle de la compra, el
// medio de pago y el botón para descargar el PDF.
//
// Es un componente hijo (clase 3) de dos pantallas, que le pasan los mismos
// datos por input():
//   - la de compra, con la compra que devolvió la base;
//   - Mi cuenta, con una compra de "Mis compras" (MiCompra tiene todos los
//     campos de CompraConfirmada). Ahí va con enMisCompras en true: sin el
//     título de confirmación ni sus botones, porque la tarjeta de la compra
//     ya tiene los suyos.
@Component({
  imports: [RouterLink, DatePipe, TitleCasePipe, ResumenCompra],
  selector: 'app-entrada',
  styleUrl: './entrada.css',
  templateUrl: './entrada.html',
})
export class Entrada implements OnInit {
  private tickets = inject(Tickets);

  // Los dos arrancan en null porque input() necesita un valor inicial; la
  // pantalla de compra siempre los manda.
  compra = input<CompraConfirmada | null>(null);
  datos = input<FuncionParaComprar | null>(null);
  enMisCompras = input(false);

  leyendaAdulto = LEYENDA_ADULTO;
  // "Tarjeta de crédito" en lugar de 'credito', para que no se confunda con
  // el crédito del cine.
  nombreDelMedio = nombreDelMedio;

  // Estado que lee el template: va en signals (D-03).
  // La imagen del QR, como data URL para el [src] del <img>.
  qr = signal<string | null>(null);
  error = signal<string | null>(null);

  // En ngOnInit los input() ya tienen el valor que mandó el padre.
  async ngOnInit() {
    const compra = this.compra();
    if (compra === null) return;

    // El QR lleva el código de la compra (D-09): es lo que escanea el
    // empleado en el ingreso (R-31).
    const resultado = await this.tickets.generarQr(compra.codigo);
    if (resultado.error || !resultado.datos) {
      // Sin QR la entrada sirve igual: el código está escrito y se puede
      // cargar a mano (R-32). Se avisa, no se oculta.
      this.error.set(resultado.error);
      return;
    }
    this.qr.set(resultado.datos);
  }

  descargarPdf() {
    const compra = this.compra();
    const datos = this.datos();
    if (compra === null || datos === null) return;

    // Devuelve null si se descargó, o el mensaje de error.
    this.error.set(this.tickets.descargarPdf(datos, compra, this.qr()));
  }
}
