import { Pipe, PipeTransform } from '@angular/core';
import { Pelicula } from '../interfaces/pelicula';
import { yaSeEstreno } from '../validadores/validadores';

// Pipe propio (clase 8): dice en qué estado está una película. El estado
// no se guarda en la base: sale de si es visible y de su fecha de estreno
// en el cine (D-27).
//   no visible                      -> 'Oculta'
//   visible y estreno futuro        -> 'Próximamente'
//   visible y estreno hoy o pasado  -> 'En cartelera'
// Uso: {{ pelicula | estadoPelicula }}
@Pipe({ name: 'estadoPelicula' })
export class EstadoPeliculaPipe implements PipeTransform {
  transform(pelicula: Pelicula): string {
    if (!pelicula.visible) return 'Oculta';
    // La misma función que usa la cartelera para decidir qué mostrar.
    return yaSeEstreno(pelicula.fecha_estreno) ? 'En cartelera' : 'Próximamente';
  }
}
