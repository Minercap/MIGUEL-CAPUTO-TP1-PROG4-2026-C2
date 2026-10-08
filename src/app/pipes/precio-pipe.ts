import { Pipe, PipeTransform } from '@angular/core';

// Pipe propio (clase 8): muestra un monto en pesos, con el punto de los
// miles: 18000 se ve como '$18.000'. Sin el punto, un monto largo cuesta
// leerlo de un vistazo.
// Los centavos se muestran solo si el monto los tiene: 1498.5 se ve como
// '$1.498,50'. Pueden aparecer en el descuento de un cupón, que es un
// porcentaje. Redondearlos haría que el resumen de la compra no cierre.
// Uso: {{ 18000 | precio }} -> '$18.000'
@Pipe({ name: 'precio' })
export class PrecioPipe implements PipeTransform {
  transform(valor: number): string {
    // Number.isInteger dice si el número no tiene decimales.
    const decimales = Number.isInteger(valor) ? 0 : 2;
    // toLocaleString escribe el número como se usa en un país (D-67). Con
    // 'es-AR', el punto separa los miles y la coma los decimales. Poner el
    // mínimo y el máximo de decimales iguales da siempre esa cantidad: dos
    // ('1.498,50', no '1.498,5') o ninguno.
    const numero = valor.toLocaleString('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
    return '$' + numero;
  }
}
