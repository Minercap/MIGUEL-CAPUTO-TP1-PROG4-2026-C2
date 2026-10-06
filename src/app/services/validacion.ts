import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import { CompraGuardada, EntradaGuardada, ItemCandyGuardado } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Producto } from '../interfaces/producto';
import { Sala } from '../interfaces/sala';
import { Resultado } from '../interfaces/resultado';
import {
  DetalleValidado,
  EntradaValidada,
  ProductoValidado,
  ResultadoValidacion,
  TipoValidacion,
} from '../interfaces/validacion';
import { normalizarCodigoCompra } from '../validadores/validadores';

// La validación del empleado (R-31 a R-33, D-51): la entrada en el ingreso
// a la sala y el candy en el mostrador, cada uno de un solo uso.
@Service()
export class Validacion {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  // Valida la entrada o el candy de la compra con ese código. Son tres
  // pasos, y solo el primero decide si se validó:
  //   1. rpc() a validar_compra (supabase/schema.sql, sección 14): la base
  //      comprueba todo y marca la compra. Si falla, no se validó nada.
  //   2. El log de actividad (R-38, D-14).
  //   3. El detalle para mostrarle al empleado.
  // Si falla el 2 o el 3, la compra ya quedó validada: se devuelve hecho
  // en true con el aviso, para que el empleado deje pasar igual.
  async validar(codigo: string, tipo: TipoValidacion): Promise<ResultadoValidacion> {
    // Mayúsculas y sin espacios, como está guardado. La base lo vuelve a
    // normalizar; acá hace falta para escribir el log con el código prolijo.
    const normalizado = normalizarCodigoCompra(codigo.trim());

    // No es un update: el empleado no tiene permiso para escribir en
    // Compras. La función comprueba y marca en una sola transacción, con
    // la fila bloqueada, y por eso dos empleados no pueden validar la
    // misma entrada a la vez (D-51).
    const { data, error } = await this.sup.Sup.rpc('validar_compra', {
      p_codigo: normalizado,
      p_tipo: tipo,
    });

    if (error) {
      // P0001 es un "raise exception" de la función. Están escritos para
      // el empleado ("Esta entrada ya se validó el 06/10 a las 18:30"), así
      // que se muestran tal cual. Cualquier otro error es técnico.
      const mensaje =
        error.code === 'P0001' ? error.message : 'No se pudo validar. Probá de nuevo.';
      return { hecho: false, error: mensaje, detalle: null };
    }

    // La función devuelve el id de la compra.
    const compraId: number = data;

    const nombre = tipo === 'entrada' ? 'Entrada' : 'Candy';
    const errorLog = await this.log.registrar(
      'validar',
      'Compras',
      compraId,
      `${nombre} ${normalizado}`,
    );

    const detalle = await this.traerDetalle(compraId, tipo);

    // Puede fallar el log, el detalle, o los dos: se avisa todo junto.
    const avisos: string[] = [];
    if (errorLog) avisos.push(errorLog);
    if (detalle.error) avisos.push(detalle.error);

    return {
      hecho: true,
      error: avisos.length > 0 ? avisos.join(' ') : null,
      detalle: detalle.datos,
    };
  }

  // Lo que se muestra después de validar. Son selects comunes: el empleado
  // tiene lectura por RLS sobre Compras, Entradas e ItemsCandy, y las
  // demás tablas son públicas. Una consulta por tabla (D-16).
  private async traerDetalle(
    compraId: number,
    tipo: TipoValidacion,
  ): Promise<Resultado<DetalleValidado>> {
    const error = 'Se validó, pero no se pudo cargar el detalle de la compra.';

    const { data: dCompra, error: e1 } = await this.sup.Sup.from('Compras')
      .select('*')
      .eq('id', compraId)
      .single();
    if (e1) return { datos: null, error };
    const compra: CompraGuardada = dCompra;

    if (tipo === 'entrada') {
      const entrada = await this.traerEntrada(compraId);
      if (!entrada) return { datos: null, error };
      return { datos: { tipo, codigo: compra.codigo, entrada, productos: [] }, error: null };
    }

    const productos = await this.traerProductos(compraId);
    if (!productos) return { datos: null, error };
    return { datos: { tipo, codigo: compra.codigo, entrada: null, productos }, error: null };
  }

  // La película, la función, la sala y las butacas de la compra. Devuelve
  // null si alguna consulta falla.
  private async traerEntrada(compraId: number): Promise<EntradaValidada | null> {
    const { data: dEntradas, error: e1 } = await this.sup.Sup.from('Entradas')
      .select('*')
      .eq('compra_id', compraId);
    if (e1) return null;
    const entradas: EntradaGuardada[] = dEntradas;
    // Toda compra tiene al menos una entrada: realizar_compra no acepta
    // una lista de butacas vacía.
    if (entradas.length === 0) return null;

    // Todas las entradas de una compra son de la misma función.
    const { data: dFuncion, error: e2 } = await this.sup.Sup.from('Funciones')
      .select('*')
      .eq('id', entradas[0].funcion_id)
      .single();
    if (e2) return null;
    const funcion: Funcion = dFuncion;

    const { data: dPelicula, error: e3 } = await this.sup.Sup.from('Peliculas')
      .select('*')
      .eq('id', funcion.pelicula_id)
      .single();
    if (e3) return null;
    const pelicula: Pelicula = dPelicula;

    const { data: dSala, error: e4 } = await this.sup.Sup.from('Salas')
      .select('*')
      .eq('id', funcion.sala_id)
      .single();
    if (e4) return null;
    const sala: Sala = dSala;

    // Ordenadas por fila y, dentro de la fila, por número: así el empleado
    // las lee como están en la sala.
    const butacas = entradas
      .map((e) => ({ fila: e.fila, numero: e.numero, es_vip: e.es_vip }))
      .sort((a, b) => a.fila.localeCompare(b.fila) || a.numero - b.numero);

    return {
      pelicula_nombre: pelicula.nombre,
      funcion_fecha_hora: funcion.fecha_hora,
      sala_nombre: sala.nombre,
      butacas,
    };
  }

  // Los productos del candy de la compra, con su cantidad. Devuelve null
  // si alguna consulta falla.
  private async traerProductos(compraId: number): Promise<ProductoValidado[] | null> {
    const { data: dItems, error: e1 } = await this.sup.Sup.from('ItemsCandy')
      .select('*')
      .eq('compra_id', compraId);
    if (e1) return null;
    const items: ItemCandyGuardado[] = dItems;

    // ProductosCandy es una tabla pública y chica: se lee entera para
    // buscar los nombres, como en Mis compras.
    const { data: dProductos, error: e2 } = await this.sup.Sup.from('ProductosCandy').select('*');
    if (e2) return null;
    const productos: Producto[] = dProductos;

    // Un mismo producto puede estar en dos filas: una pagada y otra
    // canjeada con puntos (D-45). Al empleado le da igual cómo se pagó:
    // tiene que saber cuántos entrega, así que se suman.
    const lista: ProductoValidado[] = [];
    for (const item of items) {
      const nombre = productos.find((p) => p.id === item.producto_id)?.nombre ?? 'Producto';
      const yaEsta = lista.find((p) => p.nombre === nombre);
      if (yaEsta) yaEsta.cantidad += item.cantidad;
      else lista.push({ nombre, cantidad: item.cantidad });
    }
    return lista;
  }
}
