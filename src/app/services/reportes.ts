import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { CompraGuardada, EntradaGuardada, ItemCandyGuardado } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Producto } from '../interfaces/producto';
import {
  FilaFacturacion,
  PeliculaVista,
  PeriodoMasVistas,
  PeriodoReporte,
  ProductoVendido,
  ResultadoReporte,
  TotalesFacturacion,
} from '../interfaces/reporte';

// Argentina está tres horas atrás de UTC todo el año (D-35).
const HORAS_DE_ARGENTINA_A_UTC = 3;
const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// ---------- Fechas ----------
// Los reportes agrupan por día, y el día es el de Argentina: una compra
// hecha a las 22:00 de acá está guardada como la 01:00 del día siguiente
// en UTC, pero es una venta de hoy.
//
// Para hacer cuentas con días se usa siempre lo mismo: un Date armado con
// Date.UTC y leído con los métodos getUTC..., que no dependen de la zona
// horaria del navegador.

// Un Date como 'AAAA-MM-DD', leyendo sus partes en UTC.
function aTextoDeDia(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// De 'AAAA-MM-DD' a un Date a las 00:00 UTC de ese día, para sumar días o
// preguntar qué día de la semana es.
function aFechaUtc(dia: string): Date {
  const [anio, mes, numero] = dia.split('-');
  return new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(numero)));
}

// El día de Argentina en el que cae un instante de la base: se le restan
// las tres horas y se lee en UTC, igual que en Tickets (D-35).
export function diaArgentino(instante: string): string {
  const ms = new Date(instante).getTime() - HORAS_DE_ARGENTINA_A_UTC * MS_POR_HORA;
  return aTextoDeDia(new Date(ms));
}

// El instante en el que empieza un día en Argentina, como lo espera la
// base. '-03:00' al final dice en qué zona está escrita la hora.
function inicioDelDia(dia: string): string {
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}

// El día siguiente: sirve para pedir "hasta el final del día" como "antes
// de que empiece el siguiente".
function diaSiguiente(dia: string): string {
  return aTextoDeDia(new Date(aFechaUtc(dia).getTime() + MS_POR_DIA));
}

// 'AAAA-MM-DD' -> 'DD/MM'.
function diaYMes(dia: string): string {
  const [, mes, numero] = dia.split('-');
  return `${numero}/${mes}`;
}

// Redondea a dos decimales: sumar montos con centavos en JavaScript puede
// dejar un resto (0.1 + 0.2 da 0.30000000000000004).
function centavos(monto: number): number {
  return Math.round(monto * 100) / 100;
}

// ---------- Las cuentas (D-56) ----------
// Son funciones sueltas y exportadas, sin Supabase: reciben las filas ya
// leídas y devuelven el reporte. Así se pueden probar en reportes.spec.ts
// con datos escritos a mano, igual que calcularResumen en compras.spec.ts.

// La facturación por día (R-35) y las entradas vendidas por día (R-36).
// Recibe las compras del rango, de cualquier estado, y las entradas.
//   facturado  lo cobrado con el medio de pago: total − credito_usado.
//              Cuenta también en las canceladas, porque la cancelación no
//              devuelve dinero, da crédito (R-30): la plata entró ese día.
//              El crédito usado no cuenta: esa plata ya se facturó en la
//              compra original que después se canceló.
//   compras y entradas  solo de las compras no canceladas.
// Devuelve un renglón por cada día con compras, del más viejo al más nuevo.
export function agruparFacturacion(
  compras: CompraGuardada[],
  entradas: EntradaGuardada[],
): FilaFacturacion[] {
  const filas: FilaFacturacion[] = [];

  for (const compra of compras) {
    const dia = diaArgentino(compra.creado_en);

    // El renglón de ese día; si todavía no está, se crea en cero.
    let fila = filas.find((f) => f.dia === dia);
    if (!fila) {
      fila = { dia, compras: 0, entradas: 0, facturado: 0 };
      filas.push(fila);
    }

    fila.facturado = centavos(fila.facturado + compra.total - compra.credito_usado);

    if (compra.estado !== 'cancelada') {
      fila.compras++;
      fila.entradas += entradas.filter((e) => e.compra_id === compra.id).length;
    }
  }

  // 'AAAA-MM-DD' se ordena bien como texto: va de año a día.
  return filas.sort((a, b) => a.dia.localeCompare(b.dia));
}

// La suma de todos los renglones.
export function totalesDe(filas: FilaFacturacion[]): TotalesFacturacion {
  const totales: TotalesFacturacion = { compras: 0, entradas: 0, facturado: 0 };
  for (const fila of filas) {
    totales.compras += fila.compras;
    totales.entradas += fila.entradas;
    totales.facturado = centavos(totales.facturado + fila.facturado);
  }
  return totales;
}

// El lunes de la semana en la que cae un día. getUTCDay() da 0 para el
// domingo y 1 para el lunes; con (n + 6) % 7 el lunes queda en 0 y el
// domingo en 6, que es cuántos días hay que volver atrás.
function lunesDe(dia: string): string {
  const fecha = aFechaUtc(dia);
  const diasDesdeElLunes = (fecha.getUTCDay() + 6) % 7;
  return aTextoDeDia(new Date(fecha.getTime() - diasDesdeElLunes * MS_POR_DIA));
}

// Las películas más vistas por semana o por mes (R-37). Una entrada cuenta
// como "vista" si su compra no está cancelada y su función ya ocurrió:
// antes de eso es una entrada vendida, no una película vista. Se agrupa
// por la fecha de la función, no por la de la compra.
// "ahora" llega como parámetro (en milisegundos) para poder probarla con
// una fecha fija.
export function agruparMasVistas(
  funciones: Funcion[],
  entradas: EntradaGuardada[],
  compras: CompraGuardada[],
  peliculas: Pelicula[],
  periodo: PeriodoReporte,
  ahora: number,
): PeriodoMasVistas[] {
  const periodos: PeriodoMasVistas[] = [];

  for (const funcion of funciones) {
    if (new Date(funcion.fecha_hora).getTime() > ahora) continue;

    // Las entradas de esta función cuya compra no está cancelada.
    const usadas = entradas.filter((e) => {
      if (e.funcion_id !== funcion.id) return false;
      const compra = compras.find((c) => c.id === e.compra_id);
      return compra !== undefined && compra.estado !== 'cancelada';
    }).length;
    if (usadas === 0) continue;

    // A qué período pertenece la función: su lunes o el día 1 de su mes.
    const dia = diaArgentino(funcion.fecha_hora);
    const inicio = periodo === 'semana' ? lunesDe(dia) : `${dia.slice(0, 7)}-01`;

    let grupo = periodos.find((p) => p.inicio === inicio);
    if (!grupo) {
      grupo = { inicio, etiqueta: etiquetaDelPeriodo(inicio, periodo), peliculas: [] };
      periodos.push(grupo);
    }

    const nombre = peliculas.find((p) => p.id === funcion.pelicula_id)?.nombre ?? 'Película';
    const pelicula = grupo.peliculas.find((p) => p.nombre === nombre);
    if (pelicula) pelicula.entradas += usadas;
    else grupo.peliculas.push({ nombre, entradas: usadas });
  }

  // Dentro de cada período, de la más vista a la menos vista; con la misma
  // cantidad, por nombre.
  const porEntradas = (a: PeliculaVista, b: PeliculaVista) =>
    b.entradas - a.entradas || a.nombre.localeCompare(b.nombre, 'es');
  for (const grupo of periodos) grupo.peliculas.sort(porEntradas);

  // Los períodos, del más nuevo al más viejo.
  return periodos.sort((a, b) => b.inicio.localeCompare(a.inicio));
}

// 'Semana del 05/10 al 11/10' u 'Octubre 2026'.
function etiquetaDelPeriodo(inicio: string, periodo: PeriodoReporte): string {
  if (periodo === 'mes') {
    const [anio, mes] = inicio.split('-');
    return `${MESES[Number(mes) - 1]} ${anio}`;
  }
  // El domingo es el lunes más seis días.
  const domingo = aTextoDeDia(new Date(aFechaUtc(inicio).getTime() + 6 * MS_POR_DIA));
  return `Semana del ${diaYMes(inicio)} al ${diaYMes(domingo)}`;
}

// Los productos del candy más vendidos (R-37): la suma de las cantidades
// en las compras no canceladas. Los canjes no cuentan, porque un producto
// canjeado con puntos no es una venta. Un combo es un producto más (D-40).
// Devuelve la lista del más vendido al menos vendido.
export function agruparProductos(
  compras: CompraGuardada[],
  items: ItemCandyGuardado[],
  productos: Producto[],
): ProductoVendido[] {
  const lista: ProductoVendido[] = [];

  for (const item of items) {
    if (item.es_canje) continue;
    // Solo los ítems de las compras recibidas (las del rango) y no canceladas.
    const compra = compras.find((c) => c.id === item.compra_id);
    if (!compra || compra.estado === 'cancelada') continue;

    const nombre = productos.find((p) => p.id === item.producto_id)?.nombre ?? 'Producto';
    const vendido = lista.find((p) => p.nombre === nombre);
    if (vendido) vendido.cantidad += item.cantidad;
    else lista.push({ nombre, cantidad: item.cantidad });
  }

  return lista.sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
}

// Cuántas filas devuelve Supabase, como mucho, en una consulta (D-57). Si
// una consulta trae justo esta cantidad, lo más probable es que haya más
// filas y se hayan quedado afuera.
export const LIMITE_DE_FILAS = 1000;

// Los reportes del admin (R-35 a R-37). Se calculan en el front (D-55): el
// admin tiene lectura por RLS sobre Compras, Entradas e ItemsCandy (D-24),
// así que el servicio trae las filas con selects comunes y las agrupa con
// las funciones de arriba. No hay vistas ni funciones de Postgres.
//
// En los tres métodos, desde y hasta son días 'AAAA-MM-DD' de Argentina, y
// los dos entran en el rango. Los tres devuelven un ResultadoReporte: el
// resultado de siempre más "incompleto", que avisa si alguna consulta
// llegó al límite de filas (D-57).
@Service()
export class Reportes {
  private sup = inject(SupabaseService);

  // Facturación y entradas vendidas por día de compra.
  async traerFacturacion(
    desde: string,
    hasta: string,
  ): Promise<ResultadoReporte<FilaFacturacion[]>> {
    const error = 'No se pudo cargar la facturación.';

    const compras = await this.traerCompras(desde, hasta);
    if (!compras) return { datos: null, error, incompleto: false };
    if (compras.length === 0) return { datos: [], error: null, incompleto: false };

    // Entradas no tiene fecha: la fecha es la de su compra. Por eso se
    // piden las entradas de las compras del rango, con .in() (D-57):
    // "compra_id está en esta lista de ids".
    const { data, error: e1 } = await this.sup.Sup.from('Entradas')
      .select('*')
      .in('compra_id', compras.map((c) => c.id));
    if (e1) return { datos: null, error, incompleto: false };
    const entradas: EntradaGuardada[] = data;

    return {
      datos: agruparFacturacion(compras, entradas),
      error: null,
      incompleto: this.llegoAlLimite(compras, entradas),
    };
  }

  // Películas más vistas, por semana o por mes de la función.
  async traerMasVistas(
    desde: string,
    hasta: string,
    periodo: PeriodoReporte,
  ): Promise<ResultadoReporte<PeriodoMasVistas[]>> {
    const error = 'No se pudieron cargar las películas más vistas.';

    // Acá el rango es sobre la fecha de la función, no la de la compra.
    const { data: dFunciones, error: e1 } = await this.sup.Sup.from('Funciones')
      .select('*')
      .gte('fecha_hora', inicioDelDia(desde))
      .lt('fecha_hora', inicioDelDia(diaSiguiente(hasta)));
    if (e1) return { datos: null, error, incompleto: false };
    const funciones: Funcion[] = dFunciones;
    if (funciones.length === 0) return { datos: [], error: null, incompleto: false };

    // Las entradas de esas funciones.
    const { data: dEntradas, error: e2 } = await this.sup.Sup.from('Entradas')
      .select('*')
      .in('funcion_id', funciones.map((f) => f.id));
    if (e2) return { datos: null, error, incompleto: false };
    const entradas: EntradaGuardada[] = dEntradas;
    if (entradas.length === 0) return { datos: [], error: null, incompleto: false };

    // Las compras de esas entradas, para saber cuáles están canceladas. No
    // se pueden pedir por fecha: una entrada de una función del rango se
    // pudo comprar antes del rango (una preventa). Una compra tiene varias
    // entradas, así que su id se repite: se arma la lista sin repetidos.
    const idsDeCompras: number[] = [];
    for (const entrada of entradas) {
      if (!idsDeCompras.includes(entrada.compra_id)) idsDeCompras.push(entrada.compra_id);
    }

    const { data: dCompras, error: e3 } = await this.sup.Sup.from('Compras')
      .select('*')
      .in('id', idsDeCompras);
    // Peliculas es una tabla pública y chica: se lee entera para buscar
    // los nombres.
    const { data: dPeliculas, error: e4 } = await this.sup.Sup.from('Peliculas').select('*');
    if (e3 || e4) return { datos: null, error, incompleto: false };

    const compras: CompraGuardada[] = dCompras;
    const peliculas: Pelicula[] = dPeliculas;

    return {
      datos: agruparMasVistas(funciones, entradas, compras, peliculas, periodo, Date.now()),
      error: null,
      incompleto: this.llegoAlLimite(funciones, entradas, compras, peliculas),
    };
  }

  // Productos del candy más vendidos en las compras del rango.
  async traerProductosMasVendidos(
    desde: string,
    hasta: string,
  ): Promise<ResultadoReporte<ProductoVendido[]>> {
    const error = 'No se pudieron cargar los productos más vendidos.';

    const compras = await this.traerCompras(desde, hasta);
    if (!compras) return { datos: null, error, incompleto: false };
    if (compras.length === 0) return { datos: [], error: null, incompleto: false };

    // Igual que con las entradas: los ítems de las compras del rango (D-57).
    const { data: dItems, error: e1 } = await this.sup.Sup.from('ItemsCandy')
      .select('*')
      .in('compra_id', compras.map((c) => c.id));
    const { data: dProductos, error: e2 } = await this.sup.Sup.from('ProductosCandy').select('*');
    if (e1 || e2) return { datos: null, error, incompleto: false };

    const items: ItemCandyGuardado[] = dItems;
    const productos: Producto[] = dProductos;

    return {
      datos: agruparProductos(compras, items, productos),
      error: null,
      incompleto: this.llegoAlLimite(compras, items, productos),
    };
  }

  // Las compras hechas entre los dos días, de cualquier estado. Devuelve
  // null si la consulta falla.
  // .gte() es "mayor o igual" y .lt() es "menor" (D-29). El rango va desde
  // que empieza "desde" hasta antes de que empiece el día siguiente a
  // "hasta": así entra el último día completo.
  private async traerCompras(desde: string, hasta: string): Promise<CompraGuardada[] | null> {
    const { data, error } = await this.sup.Sup.from('Compras')
      .select('*')
      .gte('creado_en', inicioDelDia(desde))
      .lt('creado_en', inicioDelDia(diaSiguiente(hasta)));
    if (error) return null;

    const compras: CompraGuardada[] = data;
    return compras;
  }

  // Dice si alguna de las listas vino con el máximo de filas (D-57).
  // Supabase no avisa cuando corta: devuelve las primeras 1000 y nada más.
  // "...listas" junta todos los argumentos en un array, para poder pasarle
  // dos, tres o cuatro listas de cualquier tipo; solo se mira el largo.
  private llegoAlLimite(...listas: { length: number }[]): boolean {
    return listas.some((lista) => lista.length >= LIMITE_DE_FILAS);
  }
}
