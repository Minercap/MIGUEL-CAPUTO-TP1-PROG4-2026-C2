import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Cartelera } from '../../services/cartelera';
import { DiaDeFunciones, PeliculaDeCartelera } from '../../interfaces/cartelera';
import { Funcion } from '../../interfaces/funcion';

// Argentina está tres horas atrás de UTC todo el año: no tiene horario de
// verano (D-35).
const HORAS_DE_ARGENTINA_A_UTC = 3;
const MS_POR_HORA = 60 * 60 * 1000;

// En el orden de Date.getUTCDay(): 0 domingo, 1 lunes ... 6 sábado.
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Detalle de una película (R-04, R-05), sin login: sus datos y sus
// funciones futuras, agrupadas por día. Tocar un horario lleva a la compra
// de esa función.
@Component({
  imports: [RouterLink, DatePipe, TitleCasePipe],
  selector: 'app-detalle-pelicula',
  styleUrl: './detalle-pelicula.css',
  templateUrl: './detalle-pelicula.html',
})
export class DetallePelicula implements OnInit {
  private carteleraSrv = inject(Cartelera);
  private ruta = inject(ActivatedRoute);

  // El :id de /pelicula/:id (D-20). No es un signal porque no cambia
  // mientras la pantalla está abierta.
  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  // Estado que lee el template: va en signals (D-03).
  cargando = signal(true);
  error = signal<string | null>(null); // no se pudo cargar la película
  errorFunciones = signal<string | null>(null); // falló solo ese bloque
  pelicula = signal<PeliculaDeCartelera | null>(null);

  // Las funciones futuras, agrupadas por día, y la clave del día elegido.
  dias = signal<DiaDeFunciones[]>([]);
  diaElegido = signal<string | null>(null);
  // Los horarios del día elegido: es lo que dibuja el template. Lo escribe
  // elegirDia().
  funcionesDelDia = signal<Funcion[]>([]);

  async ngOnInit() {
    const resultado = await this.carteleraSrv.traerPelicula(this.id);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    this.pelicula.set(resultado.datos);

    // Si fallan las funciones, la película se muestra igual: se avisa en
    // ese bloque.
    const funciones = await this.carteleraSrv.traerFuncionesFuturas(this.id);
    if (funciones.error || !funciones.datos) {
      this.errorFunciones.set(funciones.error);
    } else {
      const dias = this.agruparPorDia(funciones.datos);
      this.dias.set(dias);
      // Arranca con el primer día elegido, para que ya se vean horarios.
      if (dias.length > 0) this.elegirDia(dias[0]);
    }

    this.cargando.set(false);
  }

  elegirDia(dia: DiaDeFunciones) {
    this.diaElegido.set(dia.clave);
    this.funcionesDelDia.set(dia.funciones);
  }

  // Arma un grupo por cada día que tenga funciones. Llegan ordenadas por
  // fecha y hora, así que los días y sus horarios quedan en orden.
  private agruparPorDia(funciones: Funcion[]): DiaDeFunciones[] {
    const dias: DiaDeFunciones[] = [];

    for (const funcion of funciones) {
      // El día tiene que ser el de Argentina, no el del navegador ni el de
      // UTC: una función de las 22:00 del lunes ya es martes en UTC. Se le
      // restan las tres horas al instante y se lee con los métodos UTC de
      // Date, que no dependen de la zona del navegador.
      const instante = new Date(funcion.fecha_hora).getTime();
      const enArgentina = new Date(instante - HORAS_DE_ARGENTINA_A_UTC * MS_POR_HORA);

      const clave = `${enArgentina.getUTCFullYear()}-${enArgentina.getUTCMonth() + 1}-${enArgentina.getUTCDate()}`;

      const dia = dias.find((d) => d.clave === clave);
      if (dia) {
        dia.funciones.push(funcion);
      } else {
        dias.push({
          clave,
          etiqueta: `${DIAS_CORTOS[enArgentina.getUTCDay()]} ${enArgentina.getUTCDate()}`,
          funciones: [funcion],
        });
      }
    }
    return dias;
  }
}
