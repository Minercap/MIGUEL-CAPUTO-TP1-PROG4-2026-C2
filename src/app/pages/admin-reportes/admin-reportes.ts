import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Reportes, totalesDe } from '../../services/reportes';
import { Exportaciones } from '../../services/exportaciones';
import { CampoFecha } from '../../components/campo-fecha/campo-fecha';
import { GraficoBarras } from '../../components/grafico-barras/grafico-barras';
import { FechaPartes } from '../../interfaces/fecha-partes';
import {
  DatoDeBarra,
  FilaFacturacion,
  PeriodoReporte,
  ProductoVendido,
  TotalesFacturacion,
} from '../../interfaces/reporte';
import {
  fechaATexto,
  fechaHasta,
  fechaReal,
  hoy,
  rangoDeFechas,
  sumarDias,
} from '../../validadores/validadores';

// Un período de las películas más vistas, ya listo para el gráfico: su
// título y sus barras.
interface GraficoDePeriodo {
  etiqueta: string;
  barras: DatoDeBarra[];
}

// Cuántos días hacia atrás muestra la pantalla al abrirse.
const DIAS_POR_DEFECTO = 30;
// El rango más largo que se puede pedir: un año.
const RANGO_MAXIMO_DIAS = 366;

// Reportes del admin (R-35 a R-37): la facturación por día, con su
// exportación a PDF y a Excel, las películas más vistas y los productos
// más vendidos. Las cuentas las hace el servicio (D-55, D-56); esta
// pantalla pide el rango de fechas y muestra lo que vuelve.
// Las reglas del rango son las de docs/validaciones.md, sección 3.13.
@Component({
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, CampoFecha, GraficoBarras],
  selector: 'app-admin-reportes',
  styleUrl: './admin-reportes.css',
  templateUrl: './admin-reportes.html',
})
export class AdminReportes implements OnInit {
  private fb = inject(FormBuilder);
  private reportes = inject(Reportes);
  private exportaciones = inject(Exportaciones);

  // Estado que lee el template: va en signals (D-03).
  cargando = signal(true);
  error = signal<string | null>(null);
  errorExportar = signal<string | null>(null);
  filas = signal<FilaFacturacion[]>([]);
  totales = signal<TotalesFacturacion>({ compras: 0, entradas: 0, facturado: 0 });
  periodo = signal<PeriodoReporte>('semana');
  cargandoVistas = signal(false);
  masVistas = signal<GraficoDePeriodo[]>([]);
  productos = signal<DatoDeBarra[]>([]);
  // El rango que se está mostrando, como 'AAAA-MM-DD'. No es el del
  // formulario: el formulario puede tener fechas nuevas todavía sin
  // consultar, y los archivos se exportan con lo que está en pantalla.
  desdeMostrado = signal('');
  hastaMostrado = signal('');

  // Los años de los desplegables: el pasado y este.
  anioDesde = hoy().getFullYear() - 1;
  anioHasta = hoy().getFullYear();

  // Dos grupos anidados { dia, mes, anio } para el componente campo-fecha
  // (D-23). Arrancan con los últimos 30 días. Ninguna de las dos fechas
  // puede ser futura: todavía no hay ventas que mostrar.
  formulario = this.fb.group(
    {
      desde: this.fb.group(this.controlesDeFecha(sumarDias(hoy(), -DIAS_POR_DEFECTO)), {
        validators: [fechaReal(), fechaHasta(hoy())],
      }),
      hasta: this.fb.group(this.controlesDeFecha(hoy()), {
        validators: [fechaReal(), fechaHasta(hoy())],
      }),
    },
    // Validador del grupo entero, porque mira las dos fechas (D-17):
    // "desde" no puede ser posterior a "hasta".
    { validators: [rangoDeFechas('desde', 'hasta', RANGO_MAXIMO_DIAS)] },
  );

  // Getters para leer cada grupo desde el template (clase 4).
  get desde() {
    return this.formulario.controls.desde;
  }
  get hasta() {
    return this.formulario.controls.hasta;
  }

  // Los tres controles de un grupo de fecha, cargados con ese día. Los
  // desplegables guardan textos ('5', '10', '2026'), por eso el String.
  // Los meses de Date van de 0 a 11, por eso el + 1.
  private controlesDeFecha(fecha: Date) {
    return {
      dia: [String(fecha.getDate()), [Validators.required]],
      mes: [String(fecha.getMonth() + 1), [Validators.required]],
      anio: [String(fecha.getFullYear()), [Validators.required]],
    };
  }

  ngOnInit() {
    this.ver();
  }

  // Trae los tres reportes del rango elegido.
  async ver() {
    if (this.formulario.invalid) return;

    const valor = this.formulario.getRawValue();
    const desde = fechaATexto(this.aPartes(valor.desde));
    const hasta = fechaATexto(this.aPartes(valor.hasta));

    this.error.set(null);
    this.errorExportar.set(null);
    this.cargando.set(true);

    const facturacion = await this.reportes.traerFacturacion(desde, hasta);
    const vistas = await this.reportes.traerMasVistas(desde, hasta, this.periodo());
    const vendidos = await this.reportes.traerProductosMasVendidos(desde, hasta);

    this.cargando.set(false);
    this.desdeMostrado.set(desde);
    this.hastaMostrado.set(hasta);

    // Cada reporte se muestra si llegó. Si alguno falló, se avisa cuál y
    // ese queda vacío; los demás se ven igual.
    const errores: string[] = [];
    if (facturacion.error) errores.push(facturacion.error);
    if (vistas.error) errores.push(vistas.error);
    if (vendidos.error) errores.push(vendidos.error);
    this.error.set(errores.length > 0 ? errores.join(' ') : null);

    const filas = facturacion.datos ?? [];
    this.filas.set(filas);
    this.totales.set(totalesDe(filas));
    this.masVistas.set(
      (vistas.datos ?? []).map((p) => ({
        etiqueta: p.etiqueta,
        barras: p.peliculas.map((peli) => ({ etiqueta: peli.nombre, valor: peli.entradas })),
      })),
    );
    this.productos.set(
      (vendidos.datos ?? []).map((p: ProductoVendido) => ({ etiqueta: p.nombre, valor: p.cantidad })),
    );
  }

  // El selector Semana / Mes: vuelve a pedir solo las películas más
  // vistas, con el rango que está en pantalla.
  async elegirPeriodo(periodo: PeriodoReporte) {
    if (periodo === this.periodo() || this.cargandoVistas()) return;
    this.periodo.set(periodo);
    this.error.set(null);
    this.cargandoVistas.set(true);

    const vistas = await this.reportes.traerMasVistas(
      this.desdeMostrado(),
      this.hastaMostrado(),
      periodo,
    );

    this.cargandoVistas.set(false);
    this.error.set(vistas.error);
    this.masVistas.set(
      (vistas.datos ?? []).map((p) => ({
        etiqueta: p.etiqueta,
        barras: p.peliculas.map((peli) => ({ etiqueta: peli.nombre, valor: peli.entradas })),
      })),
    );
  }

  exportarPdf() {
    this.errorExportar.set(
      this.exportaciones.exportarFacturacionPdf(
        this.filas(),
        this.desdeMostrado(),
        this.hastaMostrado(),
      ),
    );
  }

  exportarExcel() {
    this.errorExportar.set(this.exportaciones.exportarFacturacionExcel(this.filas()));
  }

  // El valor de un grupo de fecha como FechaPartes. Un control de
  // FormBuilder puede valer null después de un reset; acá no se usa
  // reset, pero el tipo lo contempla y por eso el ?? ''.
  private aPartes(valor: { dia: string | null; mes: string | null; anio: string | null }): FechaPartes {
    return { dia: valor.dia ?? '', mes: valor.mes ?? '', anio: valor.anio ?? '' };
  }
}
