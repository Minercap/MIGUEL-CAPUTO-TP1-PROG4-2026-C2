import { TestBed } from '@angular/core/testing';
import {
  Reportes,
  agruparFacturacion,
  agruparMasVistas,
  agruparProductos,
  diaArgentino,
  totalesDe,
} from './reportes';
import { CompraGuardada, EntradaGuardada, ItemCandyGuardado } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Producto } from '../interfaces/producto';

// Una compra con los datos que cambian de un caso a otro; el resto va fijo.
function compra(
  id: number,
  creadoEn: string,
  total: number,
  creditoUsado = 0,
  estado: 'pagada' | 'cancelada' = 'pagada',
): CompraGuardada {
  return {
    id,
    usuario_id: null,
    codigo: `OLY-TEST-000${id}`,
    total,
    cupon_id: null,
    descuento_aplicado: 0,
    credito_usado: creditoUsado,
    puntos_generados: 0,
    medio_pago: 'debito',
    estado,
    entrada_validada_en: null,
    candy_entregado_en: null,
    creado_en: creadoEn,
  };
}

function entrada(id: number, compraId: number, funcionId = 1): EntradaGuardada {
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

function item(
  id: number,
  compraId: number,
  productoId: number,
  cantidad: number,
  esCanje = false,
): ItemCandyGuardado {
  return {
    id,
    compra_id: compraId,
    producto_id: productoId,
    cantidad,
    precio_unitario: esCanje ? 0 : 500,
    es_canje: esCanje,
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
    sinopsis: 'Una película para probar los reportes.',
    imagen_url: 'https://ejemplo.com/poster.png',
    duracion_minutos: 100,
    restriccion_edad: null,
    fecha_estreno: '2020-01-01',
    visible: true,
    preventa_habilitada: false,
    precio_preventa: null,
    creado_en: '2026-01-01T00:00:00+00:00',
  };
}

function producto(id: number, nombre: string, esCombo = false): Producto {
  return {
    id,
    categoria_id: 1,
    nombre,
    precio: 500,
    es_combo: esCombo,
    incluye_entrada: false,
    activo: true,
  };
}

describe('Reportes', () => {
  let service: Reportes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Reportes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Las cuentas de D-56, con filas escritas a mano.
  describe('diaArgentino', () => {
    it('una compra de las 22:00 de Argentina es del mismo día, aunque en UTC ya sea el siguiente', () => {
      // 01:00 UTC del 6 son las 22:00 del 5 en Argentina.
      expect(diaArgentino('2026-10-06T01:00:00+00:00')).toBe('2026-10-05');
      expect(diaArgentino('2026-10-06T03:00:00+00:00')).toBe('2026-10-06');
    });
  });

  describe('agruparFacturacion', () => {
    it('una compra cancelada suma a la facturación, pero no a las entradas ni a las compras', () => {
      const compras = [
        compra(1, '2026-10-05T15:00:00+00:00', 2000),
        compra(2, '2026-10-05T16:00:00+00:00', 1000, 0, 'cancelada'),
      ];
      const entradas = [entrada(1, 1), entrada(2, 1), entrada(3, 2)];

      const filas = agruparFacturacion(compras, entradas);

      expect(filas.length).toBe(1);
      expect(filas[0].dia).toBe('2026-10-05');
      // La cancelada no devolvió dinero: sus $1000 entraron ese día.
      expect(filas[0].facturado).toBe(3000);
      expect(filas[0].entradas).toBe(2);
      expect(filas[0].compras).toBe(1);
    });

    it('el crédito usado no se factura: solo lo cobrado con el medio de pago', () => {
      const compras = [compra(1, '2026-10-05T15:00:00+00:00', 3600, 1000)];

      const filas = agruparFacturacion(compras, [entrada(1, 1)]);

      expect(filas[0].facturado).toBe(2600);
    });

    it('agrupa por día de compra en hora argentina y ordena del más viejo al más nuevo', () => {
      const compras = [
        compra(1, '2026-10-07T15:00:00+00:00', 1000),
        // 01:30 UTC del 6: todavía es el 5 en Argentina.
        compra(2, '2026-10-06T01:30:00+00:00', 500),
        compra(3, '2026-10-05T12:00:00+00:00', 700),
      ];
      const entradas = [entrada(1, 1), entrada(2, 2), entrada(3, 3)];

      const filas = agruparFacturacion(compras, entradas);

      expect(filas.map((f) => f.dia)).toEqual(['2026-10-05', '2026-10-07']);
      expect(filas[0].facturado).toBe(1200);
      expect(filas[0].entradas).toBe(2);

      const totales = totalesDe(filas);
      expect(totales.facturado).toBe(2200);
      expect(totales.entradas).toBe(3);
      expect(totales.compras).toBe(3);
    });
  });

  describe('agruparProductos', () => {
    const productos = [producto(1, 'Pochoclos'), producto(2, 'Gaseosa'), producto(3, 'Combo pareja', true)];

    it('un canje no suma al producto', () => {
      const compras = [compra(1, '2026-10-05T15:00:00+00:00', 1000)];
      // Dos pochoclos pagados y uno canjeado con puntos.
      const items = [item(1, 1, 1, 2), item(2, 1, 1, 1, true), item(3, 1, 2, 1)];

      const lista = agruparProductos(compras, items, productos);

      expect(lista).toEqual([
        { nombre: 'Pochoclos', cantidad: 2 },
        { nombre: 'Gaseosa', cantidad: 1 },
      ]);
    });

    it('no cuenta las compras canceladas ni las que no están en el rango; el combo es un producto más', () => {
      const compras = [
        compra(1, '2026-10-05T15:00:00+00:00', 1000),
        compra(2, '2026-10-05T16:00:00+00:00', 1000, 0, 'cancelada'),
      ];
      const items = [
        item(1, 1, 3, 1),
        item(2, 2, 1, 5), // de la cancelada
        item(3, 99, 2, 4), // de una compra que no está entre las recibidas
      ];

      const lista = agruparProductos(compras, items, productos);

      expect(lista).toEqual([{ nombre: 'Combo pareja', cantidad: 1 }]);
    });
  });

  describe('agruparMasVistas', () => {
    const peliculas = [pelicula(1, 'Alfa'), pelicula(2, 'Beta')];
    // "Ahora" es el jueves 15/10/2026 a las 12:00 de Argentina.
    const ahora = new Date('2026-10-15T12:00:00-03:00').getTime();
    const funciones = [
      funcion(1, 1, '2026-10-05T21:00:00-03:00'), // lunes 05/10
      funcion(2, 2, '2026-10-11T21:00:00-03:00'), // domingo 11/10: la misma semana
      funcion(3, 1, '2026-10-12T21:00:00-03:00'), // lunes 12/10: la semana siguiente
      funcion(4, 2, '2026-10-20T21:00:00-03:00'), // todavía no ocurrió
    ];
    const compras = [
      compra(1, '2026-10-01T15:00:00+00:00', 1000),
      compra(2, '2026-10-01T16:00:00+00:00', 1000, 0, 'cancelada'),
    ];
    const entradas = [
      entrada(1, 1, 1),
      entrada(2, 1, 2),
      entrada(3, 1, 2),
      entrada(4, 1, 3),
      entrada(5, 1, 4), // de la función que no ocurrió
      entrada(6, 2, 1), // de la compra cancelada
    ];

    it('por semana: de lunes a domingo, sin las canceladas ni las funciones que no ocurrieron', () => {
      const periodos = agruparMasVistas(funciones, entradas, compras, peliculas, 'semana', ahora);

      // Del período más nuevo al más viejo.
      expect(periodos.map((p) => p.inicio)).toEqual(['2026-10-12', '2026-10-05']);
      expect(periodos[1].etiqueta).toBe('Semana del 05/10 al 11/10');
      // En la semana del 05/10, Beta (2) le gana a Alfa (1).
      expect(periodos[1].peliculas).toEqual([
        { nombre: 'Beta', entradas: 2 },
        { nombre: 'Alfa', entradas: 1 },
      ]);
    });

    it('por mes: junta todas las funciones del mes', () => {
      const periodos = agruparMasVistas(funciones, entradas, compras, peliculas, 'mes', ahora);

      expect(periodos.length).toBe(1);
      expect(periodos[0].etiqueta).toBe('Octubre 2026');
      // Con la misma cantidad, por nombre.
      expect(periodos[0].peliculas).toEqual([
        { nombre: 'Alfa', entradas: 2 },
        { nombre: 'Beta', entradas: 2 },
      ]);
    });
  });
});
