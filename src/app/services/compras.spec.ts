import { TestBed } from '@angular/core/testing';
import { Compras, lineasDeCandy } from './compras';
import { FuncionParaComprar } from '../interfaces/compra';
import { Producto } from '../interfaces/producto';

describe('Compras', () => {
  let service: Compras;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Compras);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // La vista previa tiene que hacer las mismas cuentas que realizar_compra
  // (D-46, D-47). Función con base 1000 y VIP 1500, sin preventa.
  describe('calcularResumen', () => {
    const datos: FuncionParaComprar = {
      funcion: {
        id: 1,
        pelicula_id: 1,
        sala_id: 1,
        fecha_hora: '2099-01-01T21:00:00+00:00',
        formato: '2D',
        idioma: 'castellano',
        precio_base: 1000,
        precio_vip: 1500,
        creado_en: '2026-01-01T00:00:00+00:00',
      },
      pelicula: {
        id: 1,
        nombre: 'Prueba',
        sinopsis: 'Una película para probar las cuentas.',
        imagen_url: 'https://ejemplo.com/poster.png',
        duracion_minutos: 100,
        restriccion_edad: null,
        fecha_estreno: '2020-01-01',
        visible: true,
        preventa_habilitada: false,
        precio_preventa: null,
        creado_en: '2026-01-01T00:00:00+00:00',
      },
      sala_nombre: 'Sala 1',
    };
    const combo: Producto = {
      id: 7,
      categoria_id: 1,
      nombre: 'Combo pareja',
      precio: 3000,
      es_combo: true,
      incluye_entrada: true,
      activo: true,
    };

    it('el combo cubre la primera butaca y cobra la diferencia VIP; cupón y crédito en orden', () => {
      const r = service.calcularResumen({
        datos,
        // La primera es VIP (fila R): la cubre el combo.
        butacas: [
          { fila: 'R', numero: 3, es_vip: true, es_accesible: false },
          { fila: 'A', numero: 1, es_vip: false, es_accesible: false },
        ],
        candy: [{ producto: combo, cantidad: 1 }],
        canjes: [],
        cupon: { id: 1, nombre: 'Bienvenida', porcentaje: 20, condicion: 'primera_compra', activo: true },
        credito: 1000,
        conSesion: true,
      });

      // Combo 3000 + diferencia VIP 500 + butaca común 1000 = 4500.
      expect(r.entradas[0].cubierta_por).toBe('combo');
      expect(r.entradas[0].precio).toBe(500);
      expect(r.entradas[1].cubierta_por).toBeNull();
      expect(r.subtotal).toBe(4500);
      // Cupón del 20% sobre el subtotal, después el crédito.
      expect(r.descuento).toBe(900);
      expect(r.total).toBe(3600);
      expect(r.credito_usado).toBe(1000);
      expect(r.a_pagar).toBe(2600);
      // 1 punto por peso pagado con el medio, no con crédito.
      expect(r.puntos_generados).toBe(2600);
    });

    it('sin sesión no hay cupón ni crédito', () => {
      const r = service.calcularResumen({
        datos,
        butacas: [{ fila: 'A', numero: 1, es_vip: false, es_accesible: false }],
        candy: [],
        canjes: [],
        cupon: { id: 1, nombre: 'Bienvenida', porcentaje: 20, condicion: 'primera_compra', activo: true },
        credito: 500,
        conSesion: false,
      });
      expect(r.cupon).toBeNull();
      expect(r.credito_usado).toBe(0);
      expect(r.a_pagar).toBe(1000);
      expect(r.puntos_generados).toBe(0);
    });

    it('el crédito no pasa del total: lo que queda a pagar es 0', () => {
      const r = service.calcularResumen({
        datos,
        butacas: [{ fila: 'A', numero: 1, es_vip: false, es_accesible: false }],
        candy: [],
        canjes: [
          { id: 2, tipo: 'producto', producto_id: 9, nombre: 'Pochoclo', costo_puntos: 150 },
        ],
        cupon: null,
        credito: 5000,
        conSesion: true,
      });
      expect(r.credito_usado).toBe(1000);
      expect(r.a_pagar).toBe(0);
      expect(r.puntos_usados).toBe(150);
      // El producto canjeado va al candy a $0.
      expect(r.candy[0].es_canje).toBe(true);
      expect(r.candy[0].precio_unitario).toBe(0);
    });
  });

  // El canje de un producto que ya está en el pedido va justo debajo del
  // pagado, para que se vea que suma uno más gratis (D-45).
  it('lineasDeCandy junta el producto pagado y su canje', () => {
    const pochoclo = { producto_id: 9, nombre: 'Pochoclo', es_combo: false, incluye_entrada: false };
    const lineas = lineasDeCandy([
      { ...pochoclo, cantidad: 2, precio_unitario: 1500, es_canje: false },
      { producto_id: 4, nombre: 'Agua', cantidad: 1, precio_unitario: 800, es_combo: false, incluye_entrada: false, es_canje: false },
      { ...pochoclo, cantidad: 1, precio_unitario: 0, es_canje: true },
    ]);
    expect(lineas.map((l) => `${l.nombre} x ${l.cantidad}${l.es_canje ? ' canje' : ''} $${l.importe}`)).toEqual([
      'Pochoclo x 2 $3000',
      'Pochoclo x 1 canje $0',
      'Agua x 1 $800',
    ]);
  });
});
