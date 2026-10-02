import { Pipe, PipeTransform } from '@angular/core';
import { Pelicula } from '../interfaces/pelicula';
import { armarFecha, hoy, textoAFecha } from '../validadores/validadores';

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

    // fecha_estreno llega como 'AAAA-MM-DD'. Se arma con sus tres partes
    // para que quede a las 00:00 de acá: new Date('AAAA-MM-DD') la toma en
    // UTC, y en Argentina eso es el día anterior a las 21 hs.
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno));
    if (estreno === null) return 'En cartelera';
    return estreno > hoy() ? 'Próximamente' : 'En cartelera';
  }
}
