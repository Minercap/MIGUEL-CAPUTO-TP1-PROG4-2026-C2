import { Funcion } from './funcion';
import { Pelicula } from './pelicula';
import { Producto } from './producto';

// Una butaca del mapa. No sale de la base: la distribución de la sala es
// fija y se arma en el front (D-07). VIP y accesible se deducen de la fila.
export interface Butaca {
  fila: string; // 'A' a 'T'
  numero: number; // posición dentro de la fila, desde 1
  es_vip: boolean; // filas R, S y T (R-14)
  es_accesible: boolean; // filas J y K (R-15)
}

// Una fila del mapa: su letra y sus butacas, separadas en los tres bloques
// que dejan los dos pasillos (R-13).
export interface FilaDeSala {
  letra: string;
  bloques: Butaca[][];
}

// Una butaca que el comprador tiene elegida, con el precio que le
// corresponde en esta función. Es lo que muestra el resumen.
export interface ButacaElegida extends Butaca {
  precio: number;
}

// Una fila de la tabla ButacasOcupadas (supabase/schema.sql, sección 11.2;
// D-38): qué butaca de qué función ya está vendida, y nada más.
export interface ButacaOcupada {
  id: number;
  funcion_id: number;
  fila: string;
  numero: number;
}

// Todo lo que la pantalla de compra necesita saber de la función elegida:
// la función, su película y el nombre de su sala.
export interface FuncionParaComprar {
  funcion: Funcion;
  pelicula: Pelicula;
  sala_nombre: string;
}

// ---------- Candy (R-21, R-22) ----------

// Un producto o combo que el comprador agregó al pedido, con cuántos lleva
// (entero de 1 a 10, validaciones.md 3.10).
export interface ProductoElegido {
  producto: Producto;
  cantidad: number;
}

// Un producto como se le manda a la base: solo el id y la cantidad. El
// precio no va: lo pone la base (D-39).
export interface ProductoPedido {
  producto_id: number;
  cantidad: number;
}

// ---------- Canje de puntos (R-28, D-45) ----------

// Una recompensa que el cliente puede elegir en el pago, ya con el nombre
// armado: "Entrada" o el nombre del producto.
export interface RecompensaParaCanjear {
  id: number;
  tipo: 'entrada' | 'producto';
  producto_id: number | null; // null si es una entrada
  nombre: string;
  costo_puntos: number;
}

// Un canje como se le manda a la base: uno por elemento.
export interface CanjePedido {
  recompensa_id: number;
}

// ---------- Pago y confirmación ----------

// Los medios de pago que el comprador puede elegir. El pago es simulado
// (A-01): se guarda solo cuál se eligió.
export type MedioPago = 'credito' | 'debito' | 'mercado_pago';

// Lo que queda guardado en la compra: uno de los medios, o 'sin_cargo' si
// el crédito y los canjes cubrieron todo (D-47).
export type MedioGuardado = MedioPago | 'sin_cargo';

// Lo que sale del formulario de pago hacia la pantalla de compra. No lleva
// los datos de la tarjeta: se validan en el formulario y se descartan, no
// se mandan ni se guardan en ningún lado.
export interface DatosDePago {
  email: string | null; // solo si no hay sesión
  // null si no queda nada para cobrar: la base guarda 'sin_cargo'.
  medio_pago: MedioPago | null;
  // Solo si no hay sesión y la película tiene restricción de edad (D-06).
  fecha_nacimiento: string | null; // 'AAAA-MM-DD'
  canjes: CanjePedido[]; // solo con sesión
  credito: number; // cuánto crédito quiere usar; 0 sin sesión
}

// Una butaca como se le manda a la base: solo fila y número.
export interface ButacaPedida {
  fila: string;
  numero: number;
}

// Lo que se le manda a la función realizar_compra de la base (D-39). Los
// precios no van: los calcula la base.
export interface PedidoDeCompra {
  funcion_id: number;
  butacas: ButacaPedida[];
  email: string | null;
  medio_pago: MedioPago | null;
  fecha_nacimiento: string | null;
  candy: ProductoPedido[];
  canjes: CanjePedido[];
  credito: number;
}

// Una butaca del resumen, con el precio que se cobra por ella.
//   cubierta_por null     se cobra normal.
//   cubierta_por 'combo'  la cubre un combo con entrada (D-46).
//   cubierta_por 'canje'  la cubre una entrada gratis por puntos (D-45).
// Si está cubierta, el precio es 0, salvo en una VIP: ahí es la
// diferencia VIP, que se cobra aparte.
export interface EntradaComprada {
  fila: string;
  numero: number;
  es_vip: boolean;
  precio: number;
  cubierta_por: 'combo' | 'canje' | null;
}

// Un renglón del candy en el resumen. Los canjeados van con precio 0 y
// es_canje en true.
export interface CandyComprado {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  es_combo: boolean;
  incluye_entrada: boolean;
  es_canje: boolean;
}

// Un canje de puntos en el resumen.
export interface CanjeComprado {
  recompensa_id: number;
  nombre: string;
  tipo: 'entrada' | 'producto';
  puntos: number;
}

// El detalle de una compra con todas sus cuentas (A-01, D-47). Tiene la
// misma forma que lo que devuelve realizar_compra: así la vista previa del
// pago y la compra confirmada se muestran con el mismo componente.
export interface ResumenDeCompra {
  en_preventa: boolean;
  entradas: EntradaComprada[];
  candy: CandyComprado[];
  canjes: CanjeComprado[];
  subtotal: number;
  cupon: { nombre: string; porcentaje: number } | null;
  descuento: number;
  total: number; // después del cupón
  credito_usado: number;
  a_pagar: number; // total − credito_usado: lo que se cobra con el medio
  puntos_usados: number;
  puntos_generados: number;
}

// Lo que devuelve realizar_compra cuando la compra salió bien: el resumen
// y lo que necesita la entrada. Un comprador sin sesión no puede volver a
// leer su compra, así que tiene que venir todo acá.
export interface CompraConfirmada extends ResumenDeCompra {
  codigo: string; // 'OLY-XXXX-XXXX': es lo que va en el QR (D-09)
  email: string;
  // true si la película tiene restricción de edad: la entrada lleva la
  // leyenda "Debe asistir acompañado por un adulto" (R-26).
  requiere_adulto: boolean;
  medio_pago: MedioGuardado;
}

// Lo que devuelve cancelar_compra (D-48): los saldos nuevos del usuario.
export interface CancelacionConfirmada {
  credito_acreditado: number;
  credito: number;
  puntos: number;
}

// ---------- Mis compras (R-12, R-29) ----------

// Una compra del cliente, con lo que muestra la lista del perfil.
export interface MiCompra extends ResumenDeCompra {
  id: number;
  codigo: string;
  creado_en: string;
  estado: 'pagada' | 'cancelada';
  medio_pago: MedioGuardado;
  entrada_validada_en: string | null;
  candy_entregado_en: string | null;
  pelicula_nombre: string;
  funcion_fecha_hora: string;
}
