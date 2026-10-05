import { Service } from '@angular/core';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { CompraConfirmada, FuncionParaComprar } from '../interfaces/compra';
import { Resultado } from '../interfaces/resultado';

// Argentina está tres horas atrás de UTC todo el año (D-35).
const HORAS_DE_ARGENTINA_A_UTC = 3;
const MS_POR_HORA = 60 * 60 * 1000;

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
      const imagen = await toDataURL(codigo, { width: 240, margin: 2 });
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
      const margen = 20;
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

      y += 12;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Butacas', margen, y);
      pdf.setFont('helvetica', 'normal');

      // Un renglón por butaca. Si es VIP, se aclara (R-14).
      for (const entrada of compra.entradas) {
        y += 7;
        const vip = entrada.es_vip ? ' (Butaca VIP)' : '';
        pdf.text(`Fila ${entrada.fila}, butaca ${entrada.numero}${vip}`, margen, y);
        pdf.text(`$${entrada.precio}`, 150, y);
      }

      y += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', margen, y);
      pdf.text(`$${compra.total}`, 150, y);

      if (compra.requiere_adulto) {
        y += 12;
        pdf.text(LEYENDA_ADULTO, margen, y);
      }

      // El QR, con la misma imagen que se ve en la pantalla.
      // addImage(imagen, formato, x, y, ancho, alto).
      y += 12;
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
      pdf.text('Presentá este código en el ingreso a la sala.', margen, y);

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

  // 'castellano' -> 'Castellano'.
  private conMayuscula(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
