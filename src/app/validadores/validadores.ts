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

// Una fecha corrida la cantidad de años indicada: negativa hacia atrás,
// positiva hacia adelante.
export function sumarAnios(fecha: Date, anios: number): Date {
  return new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());
}

// De las tres partes a 'AAAA-MM-DD', que es como Postgres recibe un date.
// padStart completa con ceros a la izquierda: '5' pasa a '05'.
export function fechaATexto(partes: FechaPartes): string {
  return `${partes.anio}-${partes.mes.padStart(2, '0')}-${partes.dia.padStart(2, '0')}`;
}

// El camino inverso, para cargar un formulario de edición: de 'AAAA-MM-DD'
// a las tres partes. Number saca los ceros de adelante ('05' pasa a '5').
export function textoAFecha(texto: string): FechaPartes {
  const [anio, mes, dia] = texto.split('-');
  return { dia: String(Number(dia)), mes: String(Number(mes)), anio: String(Number(anio)) };
}
