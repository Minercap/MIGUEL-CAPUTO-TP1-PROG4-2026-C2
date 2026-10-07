import { TestBed } from '@angular/core/testing';
import { MisPeliculas, armarMisPeliculas } from './mis-peliculas';
import { CompraGuardada, EntradaGuardada } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Resenia } from '../interfaces/resenia';

// Datos de prueba: solo importan los campos que mira la regla de D-58.
function compra(id: number, estado: 'pagada' | 'cancelada' = 'pagada'): CompraGuardada {
  return {
    id,
    usuario_id: 'u',
    email: 'prueba@ejemplo.test',
    codigo: `OLY-TEST-000${id}`,
    total: 1000,
    cupon_id: null,
    descuento_aplicado: 0,
    credito_usado: 0,
    puntos_generados: 0,
    medio_pago: 'debito',
    estado,
    entrada_validada_en: null,
    candy_entregado_en: null,
    creado_en: '2026-10-01T12:00:00+00:00',
  };
}

function entrada(id: number, compraId: number, funcionId: number): EntradaGuardada {
  return {
    id,
    compra_id: compraId,
    funcion_id: funcionId,
    fila: 'A',
    numero: id,
    es_vip: false,
    precio: 1000,
    cubierta_por: null,
  };
}

function funcion(id: number, peliculaId: number, fechaHora: string): Funcion {
  return {
    id,
    pelicula_id: peliculaId,
    sala_id: 1,
    fecha_hora: fechaHora,
    formato: '2D',
    idioma: 'castellano',
    precio_base: 1000,
    precio_vip: 1500,
    creado_en: '2026-01-01T00:00:00+00:00',
  };
}

function pelicula(id: number, nombre: string): Pelicula {
  return {
    id,
    nombre,
    sinopsis: 'Una sinopsis de más de veinte caracteres.',
    imagen_url: `https://ejemplo.test/${id}.webp`,
    duracion_minutos: 100,
    restriccion_edad: null,
    fecha_estreno: '2026-09-01',
    visible: true,
    preventa_habilitada: false,
    precio_preventa: null,
    creado_en: '',
  };
}

function resenia(peliculaId: number, estrellas: number): Resenia {
  return {
    id: 1,
    usuario_id: 'u',
    pelicula_id: peliculaId,
    estrellas,
    comentario: null,
    creado_en: '',
  };
}

// "Ahora" fijo: 10/10/2026 al mediodía UTC.
const AHORA = new Date('2026-10-10T12:00:00Z').getTime();
const PELICULAS = [pelicula(1, 'Pasada'), pelicula(2, 'Futura'), pelicula(3, 'Otra')];

describe('armarMisPeliculas (D-58)', () => {
  it('cuenta solo las funciones ya ocurridas de compras no canceladas', () => {
    const vistas = armarMisPeliculas(
      [compra(1), compra(2), compra(3, 'cancelada')],
      [entrada(1, 1, 10), entrada(2, 2, 20), entrada(3, 3, 30)],
      [
        funcion(10, 1, '2026-10-05T21:00:00+00:00'), // pasada
        funcion(20, 2, '2026-10-15T21:00:00+00:00'), // futura
        funcion(30, 3, '2026-10-04T21:00:00+00:00'), // pasada, pero cancelada
      ],
      PELICULAS,
      [],
      AHORA,
    );
    expect(vistas.map((v) => v.nombre)).toEqual(['Pasada']);
  });

  it('una función comprada dos veces aparece una sola vez', () => {
    const vistas = armarMisPeliculas(
      [compra(1), compra(2)],
      [entrada(1, 1, 10), entrada(2, 1, 10), entrada(3, 2, 10)],
      [funcion(10, 1, '2026-10-05T21:00:00+00:00')],
      PELICULAS,
      [],
      AHORA,
    );
    expect(vistas.length).toBe(1);
  });

  it('ordena de la más reciente a la más vieja y suma las estrellas propias', () => {
    const vistas = armarMisPeliculas(
      [compra(1), compra(2)],
      [entrada(1, 1, 10), entrada(2, 2, 30)],
      [funcion(10, 1, '2026-10-01T21:00:00+00:00'), funcion(30, 3, '2026-10-08T21:00:00+00:00')],
      PELICULAS,
      [resenia(1, 4)],
      AHORA,
    );
    expect(vistas.map((v) => [v.nombre, v.estrellas])).toEqual([
      ['Otra', null],
      ['Pasada', 4],
    ]);
  });
});

describe('MisPeliculas', () => {
  it('should be created', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(MisPeliculas)).toBeTruthy();
  });
});
