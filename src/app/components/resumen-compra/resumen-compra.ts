import { Component, input } from '@angular/core';
import { EntradaComprada, LineaDeCandy, ResumenDeCompra } from '../../interfaces/compra';
import { lineasDeCandy } from '../../services/compras';
import { PrecioPipe } from '../../pipes/precio-pipe';

// El detalle de una compra, renglón por renglón (A-01): cada entrada con su
// fila, su butaca y si es VIP; el candy y los combos; la diferencia VIP; los
// canjes de puntos; el cupón; el crédito, y el total.
//
// Lo usan tres pantallas: el pago (vista previa), la entrada confirmada y
// Mis compras. Las tres le pasan un ResumenDeCompra, que tiene la misma
// forma que devuelve realizar_compra: así se ve igual antes y después de
// pagar. Solo muestra; no calcula nada.
@Component({
  imports: [PrecioPipe],
  selector: 'app-resumen-compra',
  styleUrl: './resumen-compra.css',
  templateUrl: './resumen-compra.html',
})
export class ResumenCompra {
  resumen = input<ResumenDeCompra | null>(null);

  // El candy, con el canje de un producto justo debajo del mismo producto
  // pagado (D-45). Lo arma el servicio, porque el PDF usa lo mismo.
  lineas(): LineaDeCandy[] {
    return lineasDeCandy(this.resumen()?.candy ?? []);
  }

  // Las entradas cubiertas en una butaca VIP: la diferencia VIP va en su
  // propio renglón (D-46).
  conDiferenciaVip(): EntradaComprada[] {
    return this.resumen()?.entradas.filter((e) => e.cubierta_por !== null && e.es_vip) ?? [];
  }

  // Lo que se muestra al lado de cada entrada: una cubierta no se cobra
  // acá (lo que se cobra es el combo, o la diferencia VIP aparte).
  precioDeEntrada(entrada: EntradaComprada): number {
    return entrada.cubierta_por === null ? entrada.precio : 0;
  }
}
