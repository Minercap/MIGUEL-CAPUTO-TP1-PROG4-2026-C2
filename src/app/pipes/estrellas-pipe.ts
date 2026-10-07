import { Pipe, PipeTransform } from '@angular/core';

// Pipe propio (clase 8): muestra una calificación de 1 a 5 como estrellas
// llenas y vacías. Un promedio con decimales se redondea al entero más
// cercano: 3,6 se ve como cuatro estrellas.
// Uso: {{ 4 | estrellas }} -> '★★★★☆'
@Pipe({ name: 'estrellas' })
export class EstrellasPipe implements PipeTransform {
  transform(valor: number): string {
    // Math.min y Math.max lo dejan entre 0 y 5 aunque llegue otra cosa.
    const llenas = Math.min(5, Math.max(0, Math.round(valor)));
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }
}
