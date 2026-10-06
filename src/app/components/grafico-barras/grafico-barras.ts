import { Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { DatoDeBarra } from '../../interfaces/reporte';

// Gráfico de barras horizontales hecho con HTML y CSS, sin librerías
// (D-54). Cada barra es un <div> cuyo ancho es su valor sobre el valor más
// alto de la lista: la más alta ocupa el 100% y las demás, en proporción.
//
// Es un componente hijo reutilizable (clase 3): recibe los datos por
// input() y solo los dibuja. Lo usan los dos gráficos de los reportes.
@Component({
  imports: [CurrencyPipe, DecimalPipe],
  selector: 'app-grafico-barras',
  styleUrl: './grafico-barras.css',
  templateUrl: './grafico-barras.html',
})
export class GraficoBarras {
  // Las barras, en el orden en que se dibujan.
  datos = input<DatoDeBarra[]>([]);
  // Cómo se escribe el valor al lado de la barra: como cantidad o como
  // plata.
  formato = input<'numero' | 'moneda'>('numero');
  // Resalta la primera barra con el otro color: el más vendido.
  destacarPrimero = input(false);

  // El ancho de una barra, de 0 a 100, para [style.width.%]. Es un método
  // y no un valor guardado porque depende de la lista entera: si cambian
  // los datos, el template lo vuelve a pedir.
  ancho(valor: number): number {
    let maximo = 0;
    for (const dato of this.datos()) {
      if (dato.valor > maximo) maximo = dato.valor;
    }
    // Sin máximo no hay con qué comparar: se evita dividir por cero.
    if (maximo === 0) return 0;
    return (valor / maximo) * 100;
  }
}
