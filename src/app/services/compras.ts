import { Service, inject } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import {
  Butaca,
  ButacaOcupada,
  CompraConfirmada,
  FilaDeSala,
  CancelacionConfirmada,
  CandyComprado,
  CanjeComprado,
  CanjeGuardado,
  CompraGuardada,
  EntradaComprada,
  EntradaGuardada,
  ItemCandyGuardado,
  LineaDeCandy,
  MiCompra,
  FuncionParaComprar,
  MedioGuardado,
  PedidoDeCompra,
  ProductoElegido,
  RecompensaParaCanjear,
  ResumenDeCompra,
} from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Sala } from '../interfaces/sala';
import { Cupon } from '../interfaces/cupon';
import { Producto } from '../interfaces/producto';
import { Recompensa } from '../interfaces/recompensa';
import { Usuario } from '../interfaces/usuario';
import { Resultado } from '../interfaces/resultado';
import {
  armarFecha,
  edadEnAnios,
  hoy,
  sumarDias,
  textoAFecha,
} from '../validadores/validadores';

// Lo que necesita calcularResumen para armar la vista previa del pago.
export interface DatosDelResumen {
  datos: FuncionParaComprar;
  butacas: Butaca[]; // en el orden en que se eligieron (D-46)
  candy: ProductoElegido[];
  canjes: RecompensaParaCanjear[]; // una por canje: si se repite, viene dos veces
  cupon: Cupon | null;
  credito: number; // lo que el cliente pide usar
  conSesion: boolean;
}

// Redondea a centavos. Las cuentas con decimales en JavaScript dejan restos
// (0.1 + 0.2 da 0.30000000000000004): se redondea después de cada cuenta,
// igual que round(x, 2) en la base.
function centavos(monto: number): number {
  return Math.round(monto * 100) / 100;
}

// ---------- La sala (R-13, D-04) ----------
// Todas las salas tienen la misma forma, así que no se guarda en la base:
// vive acá como constantes (D-07). La función realizar_compra de la base
// valida las butacas con estas mismas reglas (schema.sql, sección 11.4):
// si cambia una, hay que cambiar la otra.

// 20 filas, de la A a la T. split('') separa el texto letra por letra.
const LETRAS_DE_FILAS = 'ABCDEFGHIJKLMNOPQRST'.split('');
// Tres bloques separados por dos pasillos: 4, 20 y 4 butacas (28 por fila).
const BLOQUES_COMUNES = [4, 20, 4];
// Las filas accesibles tienen 2, 10 y 2 (14 por fila).
const BLOQUES_ACCESIBLES = [2, 10, 2];
const FILAS_ACCESIBLES = ['J', 'K'];
const FILAS_VIP = ['R', 'S', 'T'];

// Hasta cuántas butacas se pueden llevar en una compra.
export const MAXIMO_BUTACAS = 10;

// Hasta cuántas unidades de cada producto del candy (validaciones.md 3.10).
export const MAXIMO_POR_PRODUCTO = 10;

// Los renglones del candy para el resumen y el PDF. Cada producto pagado
// va con su cantidad, y justo debajo, si también se canjeó, el renglón del
// canje a $0: así se ve que el canje suma uno más gratis y no reemplaza lo
// que ya estaba en el pedido. Los canjes de productos que no se pagaron van
// al final. Varios canjes del mismo producto se juntan en un renglón.
export function lineasDeCandy(candy: CandyComprado[]): LineaDeCandy[] {
  const lineas: LineaDeCandy[] = [];
  const canjeados = (productoId: number) =>
    candy.filter((item) => item.es_canje && item.producto_id === productoId).length;
  const lineaDeCanje = (item: CandyComprado, cantidad: number): LineaDeCandy => ({
    nombre: item.nombre,
    cantidad,
    importe: 0,
    es_combo: false,
    es_canje: true,
  });

  const pagados = candy.filter((item) => !item.es_canje);
  for (const item of pagados) {
    lineas.push({
      nombre: item.nombre,
      cantidad: item.cantidad,
      importe: centavos(item.precio_unitario * item.cantidad),
      es_combo: item.es_combo,
      es_canje: false,
    });
    const gratis = canjeados(item.producto_id);
    if (gratis > 0) lineas.push(lineaDeCanje(item, gratis));
  }

  // Los canjeados que no estaban en el pedido, una vez por producto.
  const yaListados: number[] = pagados.map((item) => item.producto_id);
  for (const item of candy) {
    if (!item.es_canje || yaListados.includes(item.producto_id)) continue;
    yaListados.push(item.producto_id);
    lineas.push(lineaDeCanje(item, canjeados(item.producto_id)));
  }
  return lineas;
}

// Cómo se muestra cada medio de pago, en la pantalla y en el PDF. 'credito'
// es la tarjeta de crédito: se escribe con todas las letras para que no se
// confunda con el crédito del cine (R-30).
export function nombreDelMedio(medio: MedioGuardado): string {
  switch (medio) {
    case 'credito':
      return 'Tarjeta de crédito';
    case 'debito':
      return 'Tarjeta de débito';
    case 'mercado_pago':
      return 'Mercado Pago';
    case 'sin_cargo':
      return 'Sin cargo';
  }
}

// Con preventa habilitada, la venta abre esta cantidad de días antes del
// estreno (R-11).
const DIAS_DE_PREVENTA = 7;

// Hasta cuántas horas antes de la función se puede cancelar (R-29).
const HORAS_PARA_CANCELAR = 2;
const MS_POR_HORA = 60 * 60 * 1000;

// La compra de entradas (R-13 a R-16, R-20): los datos de la función, el
// mapa de la sala, las butacas ocupadas en tiempo real, las reglas de
// venta y de precio, y la compra en sí. Ningún método muestra nada: devuelven
// el error ya traducido para la pantalla.
//
// Las reglas de venta y de precio están también en la base, que es la que
// decide de verdad al momento de pagar (D-39). Acá se repiten para poder
// mostrarle al comprador el precio y los avisos antes de que pague.
@Service()
export class Compras {
  private sup = inject(SupabaseService);

  // El canal de Realtime abierto, si hay uno. Lo guarda el servicio para
  // poder cerrarlo después; los componentes no tocan supabase-js.
  private canal: RealtimeChannel | null = null;

  // La función, su película y su sala: tres consultas con .single() (D-16).
  async traerFuncion(funcionId: number): Promise<Resultado<FuncionParaComprar>> {
    const { data, error } = await this.sup.Sup.from('Funciones')
      .select('*')
      .eq('id', funcionId)
      .single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe esa función.' : 'No se pudo cargar la función.';
      return { datos: null, error: mensaje };
    }
    const funcion: Funcion = data;

    const { data: dataPelicula, error: errorPelicula } = await this.sup.Sup.from('Peliculas')
      .select('*')
      .eq('id', funcion.pelicula_id)
      .single();
    if (errorPelicula) return { datos: null, error: 'No se pudo cargar la película.' };
    const pelicula: Pelicula = dataPelicula;

    const { data: dataSala, error: errorSala } = await this.sup.Sup.from('Salas')
      .select('*')
      .eq('id', funcion.sala_id)
      .single();
    if (errorSala) return { datos: null, error: 'No se pudo cargar la sala.' };
    const sala: Sala = dataSala;

    return { datos: { funcion, pelicula, sala_nombre: sala.nombre }, error: null };
  }

  // Las butacas de esa función que ya están vendidas (D-38).
  async traerOcupadas(funcionId: number): Promise<Resultado<ButacaOcupada[]>> {
    const { data, error } = await this.sup.Sup.from('ButacasOcupadas')
      .select('*')
      .eq('funcion_id', funcionId);
    if (error) return { datos: null, error: 'No se pudieron cargar las butacas ocupadas.' };

    const filas: ButacaOcupada[] = data;
    return { datos: filas, error: null };
  }

  // Realtime con postgres_changes (clase 6). Avisa de dos cosas (R-16):
  //   INSERT: se vendió una butaca de esta función -> alOcupar(butaca).
  //   DELETE: se liberó una butaca (una cancelación) -> alLiberar(id).
  // Las dos llegan a la misma función, que decide con un switch sobre
  // eventType, como en clase.
  //
  // Son dos .on() sobre el mismo canal porque no se pueden pedir igual:
  //
  //   INSERT lleva filter (D-38): 'funcion_id=eq.12' se lee "funcion_id
  //   igual a 12". Sin él llegarían las butacas vendidas de todas las
  //   funciones del cine.
  //
  //   DELETE no puede llevar ese filter. Según la documentación de
  //   Supabase, un DELETE solo se puede filtrar si la tabla tiene "replica
  //   identity full", y ButacasOcupadas no la tiene. Además, de una fila
  //   borrada Postgres avisa únicamente la clave primaria: payload.old
  //   trae el id y nada más, sin funcion_id, fila ni numero. Entonces
  //   llegan los DELETE de TODAS las funciones, y solo con su id. Por eso
  //   la pantalla guarda el id de cada butaca ocupada: cuando llega un
  //   DELETE busca ese id entre las suyas, y si no lo tiene es de otra
  //   función y lo ignora.
  //   (Tampoco se le aplica RLS a un DELETE: Postgres no puede revisar
  //   permisos sobre una fila que ya no existe. Acá no importa, porque la
  //   tabla es pública y lo único que viaja es un id.)
  escucharOcupadas(
    funcionId: number,
    alOcupar: (butaca: ButacaOcupada) => void,
    alLiberar: (id: number) => void,
  ) {
    this.dejarDeEscuchar();

    // La misma función atiende los dos avisos.
    const alCambiar = (payload: RealtimePostgresChangesPayload<ButacaOcupada>) => {
      switch (payload.eventType) {
        case 'INSERT':
          // payload.new es la fila recién insertada, completa.
          alOcupar(payload.new);
          break;
        case 'DELETE':
          // payload.old trae solo el id. Si por algún motivo no viniera,
          // no hay forma de saber qué butaca era: no se hace nada.
          if (payload.old.id !== undefined) alLiberar(payload.old.id);
          break;
      }
    };

    this.canal = this.sup.Sup.channel(`butacas-funcion-${funcionId}`);
    this.canal
      .on<ButacaOcupada>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ButacasOcupadas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        alCambiar,
      )
      .on<ButacaOcupada>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'ButacasOcupadas' },
        alCambiar,
      )
      .subscribe();
  }

  // Cierra el canal. La pantalla lo llama en ngOnDestroy (clase 6): si no,
  // el canal seguiría abierto y avisando a una pantalla que ya no existe.
  dejarDeEscuchar() {
    if (this.canal) {
      this.canal.unsubscribe();
      this.canal = null;
    }
  }

  // La compra (D-39). No son inserts: se llama con rpc() a la función
  // realizar_compra de la base (supabase/schema.sql, secciones 13.3 y
  // 13.6), que valida todo, calcula los precios, el cupón, el crédito y los
  // puntos, y guarda la compra con sus entradas, su candy y sus canjes en
  // una sola transacción.
  //
  // rpc() recibe el nombre de la función y un objeto con sus parámetros,
  // con los mismos nombres que tienen en SQL, y devuelve { data, error }
  // igual que un select. Se mandan los ocho: los que no aplican van en
  // null, en lista vacía o en 0.
  async realizarCompra(pedido: PedidoDeCompra): Promise<Resultado<CompraConfirmada>> {
    const { data, error } = await this.sup.Sup.rpc('realizar_compra', {
      p_funcion_id: pedido.funcion_id,
      p_butacas: pedido.butacas,
      p_email: pedido.email,
      p_medio_pago: pedido.medio_pago,
      p_fecha_nacimiento: pedido.fecha_nacimiento,
      p_candy: pedido.candy,
      p_canjes: pedido.canjes,
      p_credito: pedido.credito,
    });

    if (error) {
      // P0001 es el código con el que llega un "raise exception" de
      // Postgres. Todos los de realizar_compra están escritos para el
      // comprador ("Alguna de las butacas ya fue vendida. Elegí otras."),
      // así que ese texto se muestra tal cual. Cualquier otro error es
      // técnico y se reemplaza por un mensaje genérico.
      const mensaje =
        error.code === 'P0001'
          ? error.message
          : 'No se pudo completar la compra. Probá de nuevo en unos minutos.';
      return { datos: null, error: mensaje };
    }

    // La función devuelve un JSON con la forma de CompraConfirmada.
    const compra: CompraConfirmada = data;
    return { datos: compra, error: null };
  }

  // Arma el mapa: las 20 filas, cada una con sus tres bloques de butacas.
  // La numeración es corrida dentro de la fila: en una fila común, el
  // primer bloque tiene de la 1 a la 4, el del medio de la 5 a la 24 y el
  // último de la 25 a la 28.
  armarSala(): FilaDeSala[] {
    return LETRAS_DE_FILAS.map((letra) => {
      const esAccesible = FILAS_ACCESIBLES.includes(letra);
      const esVip = FILAS_VIP.includes(letra);
      const tamanios = esAccesible ? BLOQUES_ACCESIBLES : BLOQUES_COMUNES;

      let numero = 0;
      const bloques = tamanios.map((cantidad) => {
        const bloque: Butaca[] = [];
        for (let i = 0; i < cantidad; i++) {
          numero++;
          bloque.push({ fila: letra, numero, es_vip: esVip, es_accesible: esAccesible });
        }
        return bloque;
      });

      return { letra, bloques };
    });
  }

  // ---------- Reglas de venta y de precio (R-11, R-14, D-39) ----------

  // Desde qué día se venden entradas de una película: 7 días antes del
  // estreno si tiene preventa; si no, el día del estreno.
  inicioDeVenta(pelicula: Pelicula): Date {
    // fecha_estreno es obligatoria en la base; hoy() queda solo para que
    // el tipo no sea null.
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno)) ?? hoy();
    return pelicula.preventa_habilitada ? sumarDias(estreno, -DIAS_DE_PREVENTA) : estreno;
  }

  ventaAbierta(pelicula: Pelicula): boolean {
    return hoy() >= this.inicioDeVenta(pelicula);
  }

  // Está en preventa mientras no llegó el día del estreno. Desde ese día
  // el precio vuelve al normal sin que nadie toque nada.
  enPreventa(pelicula: Pelicula): boolean {
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno)) ?? hoy();
    return pelicula.preventa_habilitada && hoy() < estreno;
  }

  // Lo que cuesta una butaca en una función:
  //   VIP: siempre precio_vip, también en preventa.
  //   Comunes y accesibles: precio_preventa durante la preventa; si no,
  //   precio_base. Las accesibles valen lo mismo que las comunes.
  precioDe(butaca: Butaca, funcion: Funcion, pelicula: Pelicula): number {
    if (butaca.es_vip) return funcion.precio_vip;
    if (this.enPreventa(pelicula) && pelicula.precio_preventa !== null) {
      return pelicula.precio_preventa;
    }
    return funcion.precio_base;
  }

  // ---------- Vista previa del pago (D-45 a D-47) ----------

  // Arma el resumen del pago con las mismas cuentas, en el mismo orden, que
  // realizar_compra (schema.sql, 13.3 y 13.6). Es solo para mostrar: lo
  // que vale es lo que devuelve la base al pagar.
  //   1. Precios: butacas, productos y combos.
  //   2. Canjes: la entrada gratis o el producto canjeado van a $0.
  //   3. Un solo cupón, sobre el subtotal.
  //   4. Crédito, hasta cubrir el total.
  //   5. El resto, con el medio de pago.
  calcularResumen(d: DatosDelResumen): ResumenDeCompra {
    const { funcion, pelicula } = d.datos;
    let subtotal = 0;

    // Candy: los productos y combos elegidos, al precio del catálogo.
    const candy: CandyComprado[] = d.candy.map((e) => ({
      producto_id: e.producto.id,
      nombre: e.producto.nombre,
      cantidad: e.cantidad,
      precio_unitario: e.producto.precio,
      es_combo: e.producto.es_combo,
      incluye_entrada: e.producto.incluye_entrada,
      es_canje: false,
    }));
    for (const item of candy) subtotal = centavos(subtotal + item.precio_unitario * item.cantidad);

    // Canjes: los productos canjeados van al candy a $0; las entradas
    // gratis cubren una butaca.
    const canjes: CanjeComprado[] = d.canjes.map((r) => ({
      recompensa_id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      puntos: r.costo_puntos,
    }));
    for (const r of d.canjes) {
      if (r.tipo === 'producto') {
        candy.push({
          producto_id: r.producto_id ?? 0,
          nombre: r.nombre,
          cantidad: 1,
          precio_unitario: 0,
          es_combo: false,
          incluye_entrada: false,
          es_canje: true,
        });
      }
    }

    // Las butacas que cubren los combos y las entradas gratis: las primeras
    // de la lista, en ese orden (D-46).
    let cubreCombo = 0;
    for (const e of d.candy) if (e.producto.incluye_entrada) cubreCombo += e.cantidad;
    const cubreCanje = d.canjes.filter((r) => r.tipo === 'entrada').length;

    const entradas: EntradaComprada[] = d.butacas.map((butaca, i) => {
      let cubierta_por: 'combo' | 'canje' | null = null;
      if (i < cubreCombo) cubierta_por = 'combo';
      else if (i < cubreCombo + cubreCanje) cubierta_por = 'canje';

      // Cubierta: 0, o la diferencia VIP si la butaca es VIP. Si no, el
      // precio de la butaca, con preventa si corresponde.
      let precio: number;
      if (cubierta_por !== null) {
        precio = butaca.es_vip ? centavos(funcion.precio_vip - funcion.precio_base) : 0;
      } else {
        precio = this.precioDe(butaca, funcion, pelicula);
      }
      return { fila: butaca.fila, numero: butaca.numero, es_vip: butaca.es_vip, precio, cubierta_por };
    });
    for (const entrada of entradas) subtotal = centavos(subtotal + entrada.precio);

    // El cupón: solo con sesión, sobre el subtotal (D-47).
    const cupon = d.conSesion ? d.cupon : null;
    const descuento = cupon ? centavos((subtotal * cupon.porcentaje) / 100) : 0;
    const total = centavos(subtotal - descuento);

    // El crédito: si pide más que el total, se usa solo lo necesario.
    const pedido = d.conSesion && d.credito > 0 ? centavos(d.credito) : 0;
    const credito_usado = Math.min(pedido, total);
    const a_pagar = centavos(total - credito_usado);

    let puntos_usados = 0;
    for (const r of d.canjes) puntos_usados += r.costo_puntos;

    return {
      en_preventa: this.enPreventa(pelicula),
      entradas,
      candy,
      canjes,
      subtotal,
      cupon: cupon ? { nombre: cupon.nombre, porcentaje: cupon.porcentaje } : null,
      descuento,
      total,
      credito_usado,
      a_pagar,
      puntos_usados,
      // 1 punto por peso pagado con el medio de pago (R-27).
      puntos_generados: d.conSesion ? Math.floor(a_pagar) : 0,
    };
  }

  // El cupón que le corresponde al cliente, con la misma regla que la base
  // (D-41, D-47): entre los activos, el de mayor porcentaje de los que
  // aplican. null si no le corresponde ninguno.
  //   Primera compra: no tiene compras pagadas.
  //   Mayor de 50: tiene más de 50 años según su perfil.
  async cuponQueAplica(perfil: Usuario): Promise<Resultado<Cupon | null>> {
    const { data, error } = await this.sup.Sup.from('Cupones').select('*').eq('activo', true);
    if (error) return { datos: null, error: 'No se pudieron cargar los cupones.' };
    const cupones: Cupon[] = data;

    // Sus compras pagadas. RLS ya deja leer solo las propias; el eq por
    // usuario hace falta igual para el admin y el empleado, que leen todas.
    const { data: dataCompras, error: errorCompras } = await this.sup.Sup.from('Compras')
      .select('id')
      .eq('usuario_id', perfil.id)
      .eq('estado', 'pagada');
    if (errorCompras) return { datos: null, error: 'No se pudieron revisar tus compras.' };
    const pagadas: { id: number }[] = dataCompras;

    const nacimiento = armarFecha(textoAFecha(perfil.fecha_nacimiento));
    const mayorDe50 = nacimiento !== null && edadEnAnios(nacimiento) > 50;

    const queAplican = cupones.filter(
      (c) =>
        (c.condicion === 'primera_compra' && pagadas.length === 0) ||
        (c.condicion === 'mayor_50' && mayorDe50),
    );
    // El de mayor porcentaje; si empatan, el de menor id, como en la base.
    queAplican.sort((a, b) => b.porcentaje - a.porcentaje || a.id - b.id);
    return { datos: queAplican[0] ?? null, error: null };
  }

  // ---------- Mis compras y cancelación (R-12, R-29, R-30, D-48) ----------

  // Las compras del usuario, con todo su detalle, de la más nueva a la más
  // vieja. Son varias consultas, una por tabla, como en traerUna de
  // películas (D-16), y después se arma cada compra acá.
  //
  // Entradas, ItemsCandy y Canjes se leen enteras: RLS ya deja ver solo
  // las de las compras propias. Se filtran igual por compra, porque el
  // admin y el empleado pueden leer todas. Funciones, películas, productos,
  // recompensas y cupones son tablas públicas y chicas: se leen enteras
  // para buscar los nombres.
  async traerMisCompras(usuarioId: string): Promise<Resultado<MiCompra[]>> {
    const error = 'No se pudieron cargar tus compras.';

    const { data, error: e1 } = await this.sup.Sup.from('Compras')
      .select('*')
      .eq('usuario_id', usuarioId);
    if (e1) return { datos: null, error };
    const compras: CompraGuardada[] = data;
    if (compras.length === 0) return { datos: [], error: null };

    const { data: dEntradas, error: e2 } = await this.sup.Sup.from('Entradas').select('*');
    const { data: dItems, error: e3 } = await this.sup.Sup.from('ItemsCandy').select('*');
    const { data: dCanjes, error: e4 } = await this.sup.Sup.from('Canjes')
      .select('*')
      .eq('usuario_id', usuarioId);
    const { data: dFunciones, error: e5 } = await this.sup.Sup.from('Funciones').select('*');
    const { data: dPeliculas, error: e6 } = await this.sup.Sup.from('Peliculas').select('*');
    const { data: dProductos, error: e7 } = await this.sup.Sup.from('ProductosCandy').select('*');
    const { data: dRecompensas, error: e8 } = await this.sup.Sup.from('Recompensas').select('*');
    const { data: dCupones, error: e9 } = await this.sup.Sup.from('Cupones').select('*');
    if (e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9) return { datos: null, error };

    const entradas: EntradaGuardada[] = dEntradas;
    const items: ItemCandyGuardado[] = dItems;
    const canjes: CanjeGuardado[] = dCanjes;
    const funciones: Funcion[] = dFunciones;
    const peliculas: Pelicula[] = dPeliculas;
    const productos: Producto[] = dProductos;
    const recompensas: Recompensa[] = dRecompensas;
    const cupones: Cupon[] = dCupones;

    const nombreDeProducto = (id: number | null) =>
      productos.find((p) => p.id === id)?.nombre ?? 'Producto';

    const resultado: MiCompra[] = compras.map((compra) => {
      const suyas = entradas.filter((e) => e.compra_id === compra.id);
      // Todas las entradas de una compra son de la misma función.
      const funcion = funciones.find((f) => f.id === suyas[0]?.funcion_id);
      const pelicula = peliculas.find((p) => p.id === funcion?.pelicula_id);

      const candy: CandyComprado[] = items
        .filter((item) => item.compra_id === compra.id)
        .map((item) => {
          const producto = productos.find((p) => p.id === item.producto_id);
          return {
            producto_id: item.producto_id,
            nombre: producto?.nombre ?? 'Producto',
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            es_combo: producto?.es_combo ?? false,
            incluye_entrada: producto?.incluye_entrada ?? false,
            es_canje: item.es_canje,
          };
        });

      const canjesDeLaCompra: CanjeComprado[] = canjes
        .filter((c) => c.compra_id === compra.id)
        .map((c) => {
          const recompensa = recompensas.find((r) => r.id === c.recompensa_id);
          const esEntrada = recompensa?.tipo !== 'producto';
          return {
            recompensa_id: c.recompensa_id,
            nombre: esEntrada ? 'Entrada' : nombreDeProducto(recompensa?.producto_id ?? null),
            tipo: esEntrada ? 'entrada' : 'producto',
            puntos: c.puntos_gastados,
          };
        });

      // El total guardado es después del cupón: el subtotal es el total más
      // el descuento. El porcentaje se deduce del descuento, porque el del
      // cupón pudo cambiar después de la compra.
      const subtotal = centavos(compra.total + compra.descuento_aplicado);
      const cupon = cupones.find((c) => c.id === compra.cupon_id);
      const porcentaje =
        subtotal > 0 ? Math.round((compra.descuento_aplicado / subtotal) * 100) : 0;
      let puntosUsados = 0;
      for (const c of canjesDeLaCompra) puntosUsados += c.puntos;

      return {
        id: compra.id,
        codigo: compra.codigo,
        creado_en: compra.creado_en,
        estado: compra.estado,
        medio_pago: compra.medio_pago,
        entrada_validada_en: compra.entrada_validada_en,
        candy_entregado_en: compra.candy_entregado_en,
        pelicula_nombre: pelicula?.nombre ?? 'Película',
        funcion_fecha_hora: funcion?.fecha_hora ?? compra.creado_en,
        // Si fue en preventa no queda guardado: el historial muestra el
        // precio que se cobró, sin la marca.
        en_preventa: false,
        entradas: suyas.map((e) => ({
          fila: e.fila,
          numero: e.numero,
          es_vip: e.es_vip,
          precio: e.precio,
          cubierta_por: e.cubierta_por,
        })),
        candy,
        canjes: canjesDeLaCompra,
        subtotal,
        cupon: compra.cupon_id !== null ? { nombre: cupon?.nombre ?? 'Cupón', porcentaje } : null,
        descuento: compra.descuento_aplicado,
        total: compra.total,
        credito_usado: compra.credito_usado,
        a_pagar: centavos(compra.total - compra.credito_usado),
        puntos_usados: puntosUsados,
        puntos_generados: compra.puntos_generados,
      };
    });

    // De la más nueva a la más vieja. Las fechas de Postgres se comparan
    // bien como texto: van de año a segundo.
    resultado.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    return { datos: resultado, error: null };
  }

  // Por qué una compra no se puede cancelar, o null si se puede. Son los
  // mismos controles que hace cancelar_compra en la base (D-48): acá se
  // adelantan para no mostrar un botón que después falla.
  motivoSinCancelar(compra: MiCompra): string | null {
    if (compra.estado === 'cancelada') return 'Esta compra está cancelada.';
    if (compra.entrada_validada_en) return 'La entrada ya se usó.';
    if (compra.candy_entregado_en) return 'El candy de esta compra ya se retiró.';
    const inicio = new Date(compra.funcion_fecha_hora).getTime();
    if (Date.now() > inicio - HORAS_PARA_CANCELAR * MS_POR_HORA) {
      return 'Solo se puede cancelar hasta 2 horas antes de la función.';
    }
    return null;
  }

  // La cancelación (D-48), con rpc() como la compra. La base acredita el
  // total como crédito, devuelve los puntos canjeados, descuenta los
  // generados y libera las butacas.
  async cancelarCompra(compraId: number): Promise<Resultado<CancelacionConfirmada>> {
    const { data, error } = await this.sup.Sup.rpc('cancelar_compra', { p_compra_id: compraId });
    if (error) {
      // Igual que en la compra: los raise exception llegan con P0001 y
      // están escritos para el cliente.
      const mensaje =
        error.code === 'P0001' ? error.message : 'No se pudo cancelar la compra. Probá de nuevo.';
      return { datos: null, error: mensaje };
    }
    const cancelacion: CancelacionConfirmada = data;
    return { datos: cancelacion, error: null };
  }
}
