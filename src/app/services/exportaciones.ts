import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';
import { FilaFacturacion } from '../interfaces/reporte';
import { totalesDe } from './reportes';
import { fechaParaMostrar } from '../validadores/validadores';

// Medidas de la hoja del PDF, en milímetros (A4 mide 210 × 297).
const MARGEN = 20;
const BORDE_DERECHO = 190;
const COLUMNA_ENTRADAS = 95; // donde se escriben las entradas
const COLUMNA_FACTURADO = 140; // donde se escribe lo facturado
const ALTO_UTIL = 275; // si un renglón pasa de acá, va a una hoja nueva

// Un renglón de la hoja de Excel. Los nombres de las propiedades son los
// títulos de las columnas, por eso van con mayúscula y con tilde.
interface RenglonDeExcel {
  Día: string;
  Compras: number;
  Entradas: number;
  Facturado: number;
}

// Un monto como texto para el PDF: '$1500.00'. En un servicio no hay
// pipes, así que se arma a mano. toFixed(2) deja siempre dos decimales.
function pesos(monto: number): string {
  return `$${monto.toFixed(2)}`;
}

// Los archivos que el admin descarga del reporte de facturación (R-35,
// R-36): el PDF y el Excel. Es el único lugar de los reportes que usa las
// dos librerías externas, jsPDF (D-37) y SheetJS (D-53): si alguna se
// cambia, se cambia acá y nada más.
//
// Los dos métodos devuelven null si el archivo se descargó, o el mensaje
// de error, igual que Tickets.descargarPdf.
@Service()
export class Exportaciones {
  // El Excel. SheetJS trabaja con tres ideas:
  //   - la hoja (sheet): una tabla de celdas;
  //   - el libro (book): el archivo .xlsx, que tiene una o más hojas;
  //   - utils: las funciones que arman una hoja y un libro.
  exportarFacturacionExcel(filas: FilaFacturacion[]): string | null {
    try {
      const renglones: RenglonDeExcel[] = filas.map((fila) => ({
        Día: fechaParaMostrar(fila.dia),
        Compras: fila.compras,
        Entradas: fila.entradas,
        Facturado: fila.facturado,
      }));

      // La fila de totales va al final, como un renglón más.
      const totales = totalesDe(filas);
      renglones.push({
        Día: 'Total',
        Compras: totales.compras,
        Entradas: totales.entradas,
        Facturado: totales.facturado,
      });

      // json_to_sheet convierte una lista de objetos en una hoja: cada
      // objeto es una fila y cada propiedad, una columna. Los nombres de
      // las propiedades quedan como títulos en la primera fila.
      const hoja = utils.json_to_sheet(renglones);
      // book_new crea un libro vacío y book_append_sheet le agrega la
      // hoja, con el nombre que se ve en la pestaña de abajo.
      const libro = utils.book_new();
      utils.book_append_sheet(libro, hoja, 'Facturación');

      // writeFile arma el .xlsx y dispara la descarga en el navegador.
      writeFile(libro, 'facturacion.xlsx');
      return null;
    } catch {
      return 'No se pudo generar el Excel. Probá de nuevo.';
    }
  }

  // El PDF, con jsPDF. La tabla se dibuja a mano, con textos y líneas:
  // cada text() pone un texto en una posición (x, y) y cada line() traza
  // una raya entre dos puntos. Se lleva la cuenta de la altura en la
  // variable y, que baja un poco después de cada renglón.
  // desde y hasta son los días del rango, como 'AAAA-MM-DD'.
  exportarFacturacionPdf(filas: FilaFacturacion[], desde: string, hasta: string): string | null {
    try {
      const pdf = new jsPDF();
      let y = 25;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Olympia Cinema', MARGEN, y);

      y += 10;
      pdf.setFontSize(14);
      pdf.text('Reporte de facturación', MARGEN, y);

      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.text(`Del ${fechaParaMostrar(desde)} al ${fechaParaMostrar(hasta)}`, MARGEN, y);

      // Un renglón de la tabla: tres textos a la misma altura, cada uno en
      // su columna.
      const renglon = (dia: string, entradas: string, facturado: string) => {
        pdf.text(dia, MARGEN, y);
        pdf.text(entradas, COLUMNA_ENTRADAS, y);
        pdf.text(facturado, COLUMNA_FACTURADO, y);
      };

      // Los títulos de las columnas, en negrita y con una raya debajo. Es
      // una función porque se repiten al empezar cada hoja.
      const encabezado = () => {
        pdf.setFont('helvetica', 'bold');
        renglon('Día', 'Entradas', 'Facturado');
        pdf.setFont('helvetica', 'normal');
        y += 2;
        pdf.line(MARGEN, y, BORDE_DERECHO, y);
      };

      y += 14;
      encabezado();

      for (const fila of filas) {
        y += 7;
        // Si el renglón ya no entra, sigue en una hoja nueva.
        if (y > ALTO_UTIL) {
          pdf.addPage();
          y = MARGEN;
          encabezado();
          y += 7;
        }
        renglon(fechaParaMostrar(fila.dia), String(fila.entradas), pesos(fila.facturado));
      }

      // La fila de totales: una raya arriba y el renglón en negrita.
      const totales = totalesDe(filas);
      y += 3;
      pdf.line(MARGEN, y, BORDE_DERECHO, y);
      y += 7;
      pdf.setFont('helvetica', 'bold');
      renglon('Total', String(totales.entradas), pesos(totales.facturado));

      // save() arma el archivo y dispara la descarga en el navegador.
      pdf.save(`facturacion-${desde}-a-${hasta}.pdf`);
      return null;
    } catch {
      return 'No se pudo generar el PDF. Probá de nuevo.';
    }
  }
}
