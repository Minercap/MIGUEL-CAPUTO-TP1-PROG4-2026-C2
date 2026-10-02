import { EstadoPeliculaPipe } from './estado-pelicula-pipe';
import { Pelicula } from '../interfaces/pelicula';
import { fechaATexto } from '../validadores/validadores';

// Una película de prueba con la fecha de estreno corrida tantos días
// respecto de hoy: negativo es pasado, positivo es futuro.
function pelicula(visible: boolean, dias: number): Pelicula {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return {
    id: 1,
    nombre: 'Prueba',
    sinopsis: 'Una sinopsis de más de veinte caracteres.',
    imagen_url: 'https://ejemplo.test/poster.webp',
    duracion_minutos: 100,
    restriccion_edad: null,
    fecha_estreno: fechaATexto({
      dia: String(fecha.getDate()),
      mes: String(fecha.getMonth() + 1),
      anio: String(fecha.getFullYear()),
    }),
    visible,
    preventa_habilitada: false,
    precio_preventa: null,
    creado_en: '',
  };
}

describe('EstadoPeliculaPipe', () => {
  const pipe = new EstadoPeliculaPipe();

  it('una película no visible está oculta, estrene cuando estrene', () => {
    expect(pipe.transform(pelicula(false, -10))).toBe('Oculta');
    expect(pipe.transform(pelicula(false, 10))).toBe('Oculta');
  });

  it('visible con estreno futuro está en Próximamente', () => {
    expect(pipe.transform(pelicula(true, 1))).toBe('Próximamente');
  });

  it('visible con estreno hoy o pasado está en cartelera', () => {
    expect(pipe.transform(pelicula(true, 0))).toBe('En cartelera');
    expect(pipe.transform(pelicula(true, -1))).toBe('En cartelera');
  });
});
