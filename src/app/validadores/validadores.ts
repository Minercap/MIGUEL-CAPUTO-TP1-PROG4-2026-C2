import { AbstractControl, ValidatorFn } from '@angular/forms';
import { FechaPartes } from '../interfaces/fecha-partes';

// Validadores reutilizables: los patrones de la sección 2 de
// docs/validaciones.md, para usarlos en todos los formularios.
//
// Todos siguen la forma de la clase 4: una función que devuelve un
// ValidatorFn, que a su vez devuelve null si el valor está bien o un objeto
// con el error si falla. El nombre de la clave del error es el que después
// lee el template (campo?.errors?.['textoPersona']).
//
// Dos criterios comunes a todos:
//   1. Primero se normaliza, después se valida: el texto se mira sin los
//      espacios de adelante y de atrás.
//   2. Un campo vacío no es error de estos validadores: de eso se ocupa
//      obligatorio(). Así un campo opcional puede usarlos sin volverse
//      obligatorio.

// El valor del control como texto, sin espacios en los extremos. Un control
// sin valor (null) se lee como texto vacío.
function leerTexto(control: AbstractControl): string {
  if (control.value === null || control.value === undefined) return '';
  return String(control.value).trim();
}

// ---------- Obligatoriedad y largo ----------

// Como Validators.required, pero un texto que es solo espacios cuenta como
// vacío. Usa la misma clave 'required' para que los mensajes no cambien.
export function obligatorio(): ValidatorFn {
  return (control: AbstractControl) => (leerTexto(control) === '' ? { required: true } : null);
}

// Largo mínimo y máximo, contado sin los espacios de los extremos.
export function largo(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    return texto.length < minimo || texto.length > maximo ? { largo: { minimo, maximo } } : null;
  };
}

// ---------- Textos ----------

// Las letras que acepta textoPersona: A-Z, a-z y las latinas con acento o
// diacrítico (á, ñ, ü, ç...). Los rangos À-Ö, Ø-ö y ø-ɏ saltean a × y ÷,
// que están en el medio y no son letras. Es la misma lista que usa el check
// de la base (usuarios_nombre_solo_letras): los dos aceptan lo mismo.
const LETRAS = 'A-Za-zÀ-ÖØ-öø-ɏ';

// Una o más letras y, después, cero o más veces: un separador (espacio,
// apóstrofo o guion) seguido de una o más letras. Como cada separador tiene
// que estar seguido de letras, no puede haber dos seguidos ni uno al final.
const PATRON_TEXTO_PERSONA = new RegExp(`^[${LETRAS}]+([ '-][${LETRAS}]+)*$`);

// Nombre, apellido, titular de tarjeta.
export function textoPersona(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    return PATRON_TEXTO_PERSONA.test(texto) ? null : { textoPersona: true };
  };
}

// Los caracteres de control (códigos 0 a 31 y 127) no se ven ni se
// imprimen: tabulaciones, saltos de línea, borrado. La segunda lista deja
// afuera al salto de línea (10) y al retorno de carro (13), para las áreas
// de texto.
const CARACTERES_DE_CONTROL = /[\u0000-\u001F\u007F]/;
const CARACTERES_DE_CONTROL_SALVO_SALTOS = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/;

// Nombres de película, producto, combo, sala: cualquier carácter que se
// pueda ver. Con conSaltos en true acepta saltos de línea (sinopsis).
export function textoLibre(conSaltos = false): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    const prohibidos = conSaltos ? CARACTERES_DE_CONTROL_SALVO_SALTOS : CARACTERES_DE_CONTROL;
    return prohibidos.test(texto) ? { textoLibre: true } : null;
  };
}

// algo@algo.algo, sin espacios. Es una forma mínima: el control fino del
// mail lo hace Supabase Auth al registrar.
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 254 es el largo máximo de un mail (RFC 5321).
export function email(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    if (texto.length > 254) return { emailLargo: true };
    return PATRON_EMAIL.test(texto) ? null : { email: true };
  };
}

// Los mails se guardan y se comparan en minúsculas y sin espacios.
export function normalizarEmail(texto: string): string {
  return texto.trim().toLowerCase();
}

// ---------- Números ----------

// Dígitos y, opcionalmente, punto o coma con uno o dos decimales.
const PATRON_PRECIO = /^\d+([.,]\d{1,2})?$/;

// Precios de función, producto, combo y preventa: mayor a 0, hasta
// 1.000.000 y con dos decimales como mucho.
export function precio(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    if (!PATRON_PRECIO.test(texto)) return { precio: true };
    const numero = Number(texto.replace(',', '.'));
    return numero > 0 && numero <= 1000000 ? null : { precio: true };
  };
}

// Número entero dentro de un rango: duración, cantidades, puntos.
export function entero(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    const numero = Number(texto);
    if (!Number.isInteger(numero)) return { entero: true };
    return numero < minimo || numero > maximo ? { rango: { minimo, maximo } } : null;
  };
}

// ---------- Listas ----------

// Un campo de lista acepta solo los valores ofrecidos: el <select> se
// valida contra sus opciones, no se da por bueno porque "viene de un
// desplegable" (se puede cambiar desde la consola del navegador).
export function unoDe(opciones: string[]): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    return opciones.includes(texto) ? null : { unoDe: true };
  };
}

// Para un FormArray de checkboxes (clase 4): cuántos tienen que estar
// marcados. La regla es sobre la lista entera, no sobre un checkbox, así
// que se cuelga del FormArray (D-17).
export function cantidadMarcados(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl) => {
    const marcados: boolean[] = control.value;
    const cantidad = marcados.filter((marcado) => marcado).length;
    if (cantidad < minimo) return { pocosMarcados: minimo };
    return cantidad > maximo ? { demasiadosMarcados: maximo } : null;
  };
}

// ---------- Código de compra (D-09) ----------

const PATRON_CODIGO_COMPRA = /^OLY-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Mayúsculas y sin espacios, que es como está guardado en la base.
export function normalizarCodigoCompra(texto: string): string {
  return texto.replaceAll(' ', '').toUpperCase();
}

export function codigoCompra(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = normalizarCodigoCompra(leerTexto(control));
    if (texto === '') return null;
    return PATRON_CODIGO_COMPRA.test(texto) ? null : { codigoCompra: true };
  };
}

// ---------- Pago simulado (A-01) ----------
// Los datos de la tarjeta se validan y se descartan: no se mandan ni se
// guardan en ningún lado.

// Entre 13 y 19 dígitos: es el largo que puede tener el número de una
// tarjeta, según la marca.
const PATRON_NUMERO_DE_TARJETA = /^\d{13,19}$/;

// El algoritmo de Luhn: la cuenta que usan todas las tarjetas para detectar
// un número mal tipeado. El último dígito de una tarjeta no es parte del
// número: es un "dígito verificador", calculado a partir de los demás para
// que esta cuenta dé bien. Si se cambia un dígito, o se invierten dos
// vecinos, la cuenta deja de dar. No dice si la tarjeta existe ni si tiene
// saldo: solo que el número está bien escrito.
//
// Ejemplo con 4111 1111 1111 1111, un número de prueba válido:
//   1. Se recorren los dígitos de derecha a izquierda.
//   2. Uno sí y uno no se duplican, empezando por el segundo desde la
//      derecha. El último (el verificador) queda como está.
//   3. Si un duplicado da 10 o más, se le resta 9. Es lo mismo que sumar
//      sus dos cifras: 7 x 2 = 14, y 14 - 9 = 5, igual que 1 + 4.
//   4. Se suma todo.
//   5. El número es válido si la suma termina en 0 (es múltiplo de 10).
// En el ejemplo: de los quince 1, a 7 les toca duplicarse (2 cada uno, 14
// en total) y a 8 no (8 en total); al 4 le toca duplicarse y da 8.
// 14 + 8 + 8 = 30, que termina en 0: es válido.
//
// Recibe solo dígitos: el patrón de arriba se controla antes.
function cumpleLuhn(digitos: string): boolean {
  let suma = 0;
  // false para el último dígito, true para el anterior, y así alternando.
  let duplicar = false;

  // Paso 1: de derecha a izquierda, desde el último índice hasta el 0.
  for (let i = digitos.length - 1; i >= 0; i--) {
    let digito = Number(digitos[i]);

    if (duplicar) {
      digito = digito * 2; // paso 2
      if (digito > 9) digito = digito - 9; // paso 3
    }

    suma = suma + digito; // paso 4
    duplicar = !duplicar; // el siguiente hace lo contrario
  }

  // Paso 5: el resto de dividir por 10 es 0 si la suma termina en 0.
  return suma % 10 === 0;
}

// Número de tarjeta (docs/validaciones.md, 3.11): de 13 a 19 dígitos y que
// cumpla el algoritmo de Luhn. Se aceptan espacios entre medio
// ("4111 1111 1111 1111"), que es como viene impreso en la tarjeta: se
// sacan antes de mirar. Son dos errores distintos para poder decirle al
// comprador qué pasa: le faltan o sobran dígitos, o tipeó mal alguno.
export function numeroDeTarjeta(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control).replaceAll(' ', '');
    if (texto === '') return null;
    if (!PATRON_NUMERO_DE_TARJETA.test(texto)) return { numeroDeTarjeta: true };
    return cumpleLuhn(texto) ? null : { luhn: true };
  };
}

const PATRON_CODIGO_DE_SEGURIDAD = /^\d{3,4}$/;

// El código de seguridad (CVV): 3 o 4 dígitos, según la marca.
export function codigoDeSeguridad(): ValidatorFn {
  return (control: AbstractControl) => {
    const texto = leerTexto(control);
    if (texto === '') return null;
    return PATRON_CODIGO_DE_SEGURIDAD.test(texto) ? null : { codigoDeSeguridad: true };
  };
}

// Para el grupo { mes, anio } del vencimiento (dos desplegables, D-23): la
// tarjeta no puede estar vencida. Vence al terminar el mes indicado, así
// que el mes actual todavía es válido. Mientras falte elegir alguno de los
// dos no informa error.
export function noVencida(): ValidatorFn {
  return (grupo: AbstractControl) => {
    const valor: { mes: string; anio: string } = grupo.value;
    if (valor.mes === '' || valor.anio === '') return null;

    const ahora = new Date();
    const anio = Number(valor.anio);
    const mes = Number(valor.mes);
    // Los meses de Date van de 0 a 11, por eso el + 1.
    const vencida =
      anio < ahora.getFullYear() ||
      (anio === ahora.getFullYear() && mes < ahora.getMonth() + 1);
    return vencida ? { tarjetaVencida: true } : null;
  };
}

// ---------- Imágenes ----------

const TIPOS_DE_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

// Para un FormControl<File | null> (clase 7): el archivo tiene que ser JPG,
// PNG o WebP y no pasar el peso máximo. File.type es el tipo que informa el
// navegador y File.size el peso en bytes.
export function imagen(maximoMb = 2): ValidatorFn {
  return (control: AbstractControl) => {
    const archivo: File | null = control.value;
    if (archivo === null) return null;
    if (!TIPOS_DE_IMAGEN.includes(archivo.type)) return { imagenTipo: true };
    return archivo.size > maximoMb * 1024 * 1024 ? { imagenPeso: maximoMb } : null;
  };
}

// ---------- Reglas entre dos campos (se cuelgan del FormGroup, D-17) ----------

// Los dos campos tienen que tener el mismo valor: contraseña y su
// confirmación. Mira dos controles a la vez, así que va en el grupo y el
// error queda en formulario.errors, no en un campo.
export function camposIguales(campo: string, confirmacion: string): ValidatorFn {
  return (grupo: AbstractControl) => {
    const valor: string | null = grupo.get(campo)?.value;
    const repetido: string | null = grupo.get(confirmacion)?.value;
    if (!repetido) return null;
    return valor === repetido ? null : { camposDistintos: true };
  };
}

// El primer campo tiene que ser mayor que el segundo: el precio VIP y el
// precio base de una función (R-14). Mientras falte alguno de los dos no
// informa error: de eso se ocupa el required de cada uno.
export function mayorQue(campoMayor: string, campoMenor: string): ValidatorFn {
  return (grupo: AbstractControl) => {
    const mayor: number | null = grupo.get(campoMayor)?.value;
    const menor: number | null = grupo.get(campoMenor)?.value;
    if (mayor === null || menor === null) return null;
    return Number(mayor) > Number(menor) ? null : { noEsMayor: true };
  };
}

// Dos fechas que forman un rango: "hasta" no puede ser anterior a "desde",
// y entre las dos no puede haber más de maximoDias. Cada campo es un grupo
// { dia, mes, anio } (D-23). Si alguna de las dos todavía no es una fecha
// completa no informa error.
export function rangoDeFechas(campoDesde: string, campoHasta: string, maximoDias: number): ValidatorFn {
  return (grupo: AbstractControl) => {
    const desde = armarFecha(grupo.get(campoDesde)?.value);
    const hasta = armarFecha(grupo.get(campoHasta)?.value);
    if (desde === null || hasta === null) return null;
    if (hasta < desde) return { rangoInvertido: true };
    return hasta > sumarDias(desde, maximoDias) ? { rangoLargo: maximoDias } : null;
  };
}

// ---------- Fechas (D-23) ----------
// Los validadores de fecha se cuelgan del grupo { dia, mes, anio }, porque
// la validez depende de los tres desplegables a la vez. Mientras falte
// elegir alguno no informan error: de eso se ocupa el required de cada uno.

// Arma la fecha a partir de las tres partes. Devuelve null si falta alguna
// o si la fecha no existe (31/02, 29/02 de un año no bisiesto).
export function armarFecha(partes: FechaPartes): Date | null {
  if (partes.dia === '' || partes.mes === '' || partes.anio === '') return null;
  const dia = Number(partes.dia);
  const mes = Number(partes.mes);
  const anio = Number(partes.anio);

  // Los meses de Date van de 0 a 11. Si el día no existe en ese mes, Date
  // no falla: se pasa al mes siguiente (31/02 se vuelve 03/03). Por eso se
  // compara lo que quedó con lo que se pidió.
  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe ? fecha : null;
}

function faltaAlgunaParte(partes: FechaPartes): boolean {
  return partes.dia === '' || partes.mes === '' || partes.anio === '';
}

// Rechaza las fechas imposibles.
export function fechaReal(): ValidatorFn {
  return (grupo: AbstractControl) => {
    const partes: FechaPartes = grupo.value;
    if (faltaAlgunaParte(partes)) return null;
    return armarFecha(partes) === null ? { fechaImposible: true } : null;
  };
}

// La fecha no puede ser anterior a la mínima.
export function fechaDesde(minima: Date): ValidatorFn {
  return (grupo: AbstractControl) => {
    const fecha = armarFecha(grupo.value);
    if (fecha === null) return null;
    return fecha < minima ? { fechaMinima: true } : null;
  };
}

// La fecha no puede ser posterior a la máxima.
export function fechaHasta(maxima: Date): ValidatorFn {
  return (grupo: AbstractControl) => {
    const fecha = armarFecha(grupo.value);
    if (fecha === null) return null;
    return fecha > maxima ? { fechaMaxima: true } : null;
  };
}

// El día de hoy a las 00:00, para comparar fechas sin que influya la hora.
export function hoy(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

// Dice si una película ya se estrenó en el cine: su fecha de estreno es
// hoy o anterior. Es el criterio que separa "en cartelera" de
// "Próximamente" (D-27), y lo usan el pipe de estado y la cartelera, para
// que los dos digan lo mismo.
// fechaEstreno llega como 'AAAA-MM-DD'. Se arma con sus tres partes para
// que quede a las 00:00 de acá: new Date('AAAA-MM-DD') la toma en UTC, y en
// Argentina eso es el día anterior a las 21 hs.
export function yaSeEstreno(fechaEstreno: string): boolean {
  const estreno = armarFecha(textoAFecha(fechaEstreno));
  if (estreno === null) return true;
  return estreno <= hoy();
}

// Una fecha corrida la cantidad de años indicada: negativa hacia atrás,
// positiva hacia adelante.
export function sumarAnios(fecha: Date, anios: number): Date {
  return new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());
}

// Los años cumplidos al día de hoy por alguien que nació en esa fecha. Se
// restan los años y, si este año todavía no llegó el cumpleaños, se
// descuenta uno.
export function edadEnAnios(nacimiento: Date): number {
  const actual = hoy();
  let edad = actual.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(actual.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (actual < cumpleEsteAnio) edad--;
  return edad;
}

// Una fecha corrida la cantidad de días indicada. Si el día se pasa del
// mes, Date lo acomoda solo: el 28/10 más 5 días es el 02/11.
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// De las tres partes a 'AAAA-MM-DD', que es como Postgres recibe un date.
// padStart completa con ceros a la izquierda: '5' pasa a '05'.
export function fechaATexto(partes: FechaPartes): string {
  return `${partes.anio}-${partes.mes.padStart(2, '0')}-${partes.dia.padStart(2, '0')}`;
}

// De 'AAAA-MM-DD' a 'DD/MM/AAAA', para mostrar una fecha de la base en un
// mensaje.
export function fechaParaMostrar(texto: string): string {
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

// Lo mismo a partir de un Date: su día, en la hora de acá, como
// 'DD/MM/AAAA'. Los meses de Date van de 0 a 11, por eso el + 1.
export function diaParaMostrar(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

// El camino inverso, para cargar un formulario de edición: de 'AAAA-MM-DD'
// a las tres partes. Number saca los ceros de adelante ('05' pasa a '5').
export function textoAFecha(texto: string): FechaPartes {
  const [anio, mes, dia] = texto.split('-');
  return { dia: String(Number(dia)), mes: String(Number(mes)), anio: String(Number(anio)) };
}
