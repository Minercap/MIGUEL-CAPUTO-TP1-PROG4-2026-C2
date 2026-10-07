import { Service } from '@angular/core';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { CompraConfirmada, EntradaComprada, FuncionParaComprar } from '../interfaces/compra';
import { Resultado } from '../interfaces/resultado';
import { lineasDeCandy, nombreDelMedio } from './compras';

// Argentina está tres horas atrás de UTC todo el año (D-35).
const HORAS_DE_ARGENTINA_A_UTC = 3;
const MS_POR_HORA = 60 * 60 * 1000;

// Medidas de la hoja, en milímetros (A4 mide 210 × 297).
const MARGEN = 20;
const COLUMNA_MONTO = 160; // donde se escriben los montos
const ALTO_UTIL = 275; // si un renglón pasa de acá, va a una hoja nueva

// La leyenda que lleva toda entrada de una película con restricción de
// edad (R-26, mail del 12/02). Es la misma en la pantalla y en el PDF.
export const LEYENDA_ADULTO = 'Debe asistir acompañado por un adulto.';

// La entrada que recibe el comprador (R-20): el QR con el código de la
// compra y el PDF para descargar. Es el único lugar de la app que usa las
// dos librerías externas, qrcode (D-36) y jsPDF (D-37): si alguna se
// cambia, se cambia acá y nada más.
@Service()
export class Tickets {
  // El QR del código de la compra, como imagen.
  // toDataURL (qrcode) devuelve una promesa con una "data URL": la imagen
  // PNG entera escrita como texto ('data:image/png;base64,...'). Ese texto
  // sirve tal cual como [src] de un <img> y como imagen para el PDF, sin
  // subir ningún archivo a ningún lado.
  //   width   el ancho de la imagen, en píxeles.
  //   margin  el borde blanco alrededor, medido en cuadraditos del QR.
  async generarQr(codigo: string): Promise<Resultado<string>> {
    try {
      // 480 px: se ve nítido en la pantalla aunque se muestre grande.
      const imagen = await toDataURL(codigo, { width: 480, margin: 2 });
      return { datos: imagen, error: null };
    } catch {
      return { datos: null, error: 'No se pudo generar el código QR.' };
    }
  }

  // Arma el PDF de la entrada y lo descarga. Devuelve null si salió bien,
  // o el mensaje de error.
  //
  // jsPDF trabaja como una hoja en la que se va escribiendo: cada text()
  // pone un texto en una posición (x, y), medida en milímetros desde la
  // esquina de arriba a la izquierda de una hoja A4. No acomoda nada solo:
  // por eso se lleva la cuenta de la altura en la variable y, que baja un
  // poco después de cada renglón.
  descargarPdf(datos: FuncionParaComprar, compra: CompraConfirmada, qr: string | null): string | null {
    try {
      const pdf = new jsPDF();
      const margen = MARGEN;
      let y = 25;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Olympia Cinema', margen, y);

      y += 10;
      pdf.setFontSize(14);
      pdf.text('Entrada', margen, y);

      // Una raya de lado a lado: line(x1, y1, x2, y2).
      y += 4;
      pdf.line(margen, y, 190, y);

      y += 12;
      pdf.setFontSize(16);
      pdf.text(datos.pelicula.nombre, margen, y);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      y += 8;
      pdf.text(`Función: ${this.fechaYHora(datos.funcion.fecha_hora)} hs`, margen, y);
      y += 7;
      pdf.text(
        `${datos.sala_nombre} - ${datos.funcion.formato} - ${this.conMayuscula(datos.funcion.idioma)}`,
        margen,
        y,
      );
      y += 7;
      pdf.text(`Comprador: ${compra.email}`, margen, y);

      // El detalle, renglón por renglón (A-01): lo mismo que se ve en la
      // pantalla. Cada renglón lo escribe renglon(), que además pasa a una
      // hoja nueva si ya no entra.
      y += 12;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalle', margen, y);
      pdf.setFont('helvetica', 'normal');

      const renglon = (texto: string, monto: string) => {
        y += 7;
        if (y > ALTO_UTIL) {
          pdf.addPage();
          y = MARGEN;
        }
        pdf.text(texto, margen, y);
        pdf.text(monto, COLUMNA_MONTO, y);
      };

      // Las entradas, cada una con su fila, su butaca y si es VIP (R-14).
      for (const entrada of compra.entradas) {
        const monto = entrada.cubierta_por === null ? entrada.precio : 0;
        renglon(this.textoDeEntrada(entrada, compra.en_preventa), `$${monto}`);
      }
      // La diferencia VIP de una butaca cubierta va en su propio renglón (D-46).
      for (const entrada of compra.entradas) {
        if (entrada.cubierta_por !== null && entrada.es_vip) {
          const butaca = `fila ${entrada.fila}, butaca ${entrada.numero}`;
          renglon(`Diferencia VIP (${butaca})`, `$${entrada.precio}`);
        }
      }
      // El candy, con el canje de un producto justo debajo del mismo
      // producto pagado (D-45), igual que en la pantalla. Va bajo el
      // título "Candy Shop" (D-62).
      const lineasCandy = lineasDeCandy(compra.candy);
      if (lineasCandy.length > 0) renglon('Candy Shop', '');
      for (const linea of lineasCandy) {
        const marca = linea.es_canje ? ' (canje)' : linea.es_combo ? ' (combo)' : '';
        renglon(`${linea.nombre} x ${linea.cantidad}${marca}`, `$${linea.importe}`);
      }
      // El detalle de los puntos.
      for (const canje of compra.canjes) {
        renglon(`Canje: ${canje.nombre} (${canje.puntos} puntos)`, '$0');
      }

      // Las cuentas (D-47). Cada descuento en su renglón (A-01).
      y += 4;
      renglon('Subtotal', `$${compra.subtotal}`);
      if (compra.cupon) {
        renglon(`Cupón ${compra.cupon.nombre} (${compra.cupon.porcentaje}%)`, `-$${compra.descuento}`);
      }
      renglon('Total', `$${compra.total}`);
      if (compra.credito_usado > 0) {
        renglon('Crédito del cine', `-$${compra.credito_usado}`);
      }
      pdf.setFont('helvetica', 'bold');
      renglon('A pagar', `$${compra.a_pagar}`);
      pdf.setFont('helvetica', 'normal');
      // 'credito' se escribe "Tarjeta de crédito": no es el crédito del cine.
      renglon(`Medio de pago: ${nombreDelMedio(compra.medio_pago)}`, '');
      if (compra.puntos_usados > 0) renglon(`Puntos canjeados: ${compra.puntos_usados}`, '');
      if (compra.puntos_generados > 0) {
        renglon(`Puntos que suma esta compra: ${compra.puntos_generados}`, '');
      }

      pdf.setFont('helvetica', 'bold');
      if (compra.requiere_adulto) {
        y += 12;
        pdf.text(LEYENDA_ADULTO, margen, y);
      }

      // El QR, con la misma imagen que se ve en la pantalla.
      // addImage(imagen, formato, x, y, ancho, alto).
      y += 12;
      // El QR y el código ocupan unos 70 mm: si no entran, van a otra hoja.
      if (y + 70 > ALTO_UTIL) {
        pdf.addPage();
        y = MARGEN;
      }
      if (qr !== null) {
        pdf.addImage(qr, 'PNG', margen, y, 50, 50);
        y += 56;
      }

      // El código también va escrito: es lo que se le dicta al empleado si
      // el lector no funciona (R-32).
      pdf.setFontSize(14);
      pdf.text(`Código: ${compra.codigo}`, margen, y);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      y += 8;
      pdf.text(
        compra.candy.length > 0
          ? 'Presentá este código en el ingreso a la sala y en el Candy Shop.'
          : 'Presentá este código en el ingreso a la sala.',
        margen,
        y,
      );

      // save() arma el archivo y dispara la descarga en el navegador.
      pdf.save(`entrada-${compra.codigo}.pdf`);
      return null;
    } catch {
      return 'No se pudo generar el PDF. Probá de nuevo.';
    }
  }

  // El instante de la función escrito en hora argentina: '12/10/2026 18:00'.
  // En un servicio no hay pipes, así que se arma a mano: se le restan las
  // tres horas al instante y se lee con los métodos UTC de Date, que no
  // dependen de la zona horaria del navegador (D-35).
  private fechaYHora(fechaHora: string): string {
    const instante = new Date(fechaHora).getTime();
    const f = new Date(instante - HORAS_DE_ARGENTINA_A_UTC * MS_POR_HORA);
    const dia = String(f.getUTCDate()).padStart(2, '0');
    const mes = String(f.getUTCMonth() + 1).padStart(2, '0');
    const hora = String(f.getUTCHours()).padStart(2, '0');
    const minutos = String(f.getUTCMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${f.getUTCFullYear()} ${hora}:${minutos}`;
  }

  // El renglón de una entrada: la butaca, si es VIP, y por qué no se cobra
  // o si va a precio de preventa.
  private textoDeEntrada(entrada: EntradaComprada, enPreventa: boolean): string {
    let texto = `Fila ${entrada.fila}, butaca ${entrada.numero}`;
    if (entrada.es_vip) texto += ' (Butaca VIP)';
    if (entrada.cubierta_por === 'combo') texto += ' - incluida en el combo';
    else if (entrada.cubierta_por === 'canje') texto += ' - entrada gratis con puntos';
    else if (enPreventa && !entrada.es_vip) texto += ' - precio de preventa';
    return texto;
  }

  // 'castellano' -> 'Castellano'.
  private conMayuscula(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
