import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Compras, MAXIMO_BUTACAS } from '../../services/compras';
import {
  Butaca,
  ButacaElegida,
  ButacaOcupada,
  FuncionParaComprar,
} from '../../interfaces/compra';
import { diaParaMostrar } from '../../validadores/validadores';

// Compra de entradas para una función (R-13 a R-16). En esta parte: el
// encabezado con los datos de la función, el mapa de butacas en tiempo
// real y el resumen de lo elegido. El pago se agrega en la parte siguiente.
// No lleva guard: se puede comprar sin cuenta (R-02).
@Component({
  imports: [RouterLink, DatePipe, TitleCasePipe],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra implements OnInit, OnDestroy {
  private comprasSrv = inject(Compras);
  private ruta = inject(ActivatedRoute);

  // El :funcionId de /compra/:funcionId (D-20). No es un signal porque no
  // cambia mientras la pantalla está abierta.
  private funcionId = Number(this.ruta.snapshot.paramMap.get('funcionId'));

  // El mapa de la sala. Es fijo (D-07): no es un signal porque nunca
  // cambia. Lo que cambia es el estado de cada butaca, que va aparte.
  sala = this.comprasSrv.armarSala();
  maximo = MAXIMO_BUTACAS;

  // Estado que lee el template: va en signals (D-03).
  cargando = signal(true);
  error = signal<string | null>(null); // no se pudo cargar la pantalla
  datos = signal<FuncionParaComprar | null>(null);
  // Si la función no se puede comprar, acá va el porqué, y se muestra en
  // lugar del mapa. null = se puede comprar.
  motivoSinVenta = signal<string | null>(null);
  // Avisos mientras se eligen butacas: se llegó al máximo, o alguien
  // compró una que estaba elegida.
  aviso = signal<string | null>(null);

  // Las butacas vendidas de esta función, como claves 'A-5'. Con textos,
  // saber si una butaca está ocupada es un includes().
  ocupadas = signal<string[]>([]);
  // Las que tiene elegidas el comprador, con su precio, y la suma.
  elegidas = signal<ButacaElegida[]>([]);
  total = signal(0);

  async ngOnInit() {
    const resultado = await this.comprasSrv.traerFuncion(this.funcionId);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    const datos = resultado.datos;
    this.datos.set(datos);

    // Si no se puede comprar, se muestra el motivo y no se carga el mapa.
    const motivo = this.porQueNoSeVende(datos);
    if (motivo) {
      this.motivoSinVenta.set(motivo);
      this.cargando.set(false);
      return;
    }

    const ocupadas = await this.comprasSrv.traerOcupadas(this.funcionId);
    if (ocupadas.error || !ocupadas.datos) {
      this.error.set(ocupadas.error);
      this.cargando.set(false);
      return;
    }
    this.ocupadas.set(ocupadas.datos.map((butaca) => this.clave(butaca)));

    // Desde acá, cada butaca que se venda en esta función llega sola
    // (R-16). El callback escribe signals: con OnPush, si escribiera
    // campos comunes la pantalla no se movería aunque el dato llegue (D-03).
    this.comprasSrv.escucharOcupadas(this.funcionId, (butaca) => this.marcarOcupada(butaca));

    this.cargando.set(false);
  }

  // Al salir de la pantalla se cierra el canal de Realtime (clase 6).
  ngOnDestroy() {
    this.comprasSrv.dejarDeEscuchar();
  }

  // Prende o apaga una butaca del mapa.
  alternar(butaca: Butaca) {
    const datos = this.datos();
    if (datos === null || this.estaOcupada(butaca)) return;
    this.aviso.set(null);

    if (this.estaElegida(butaca)) {
      // Lista nueva sin esa butaca (inmutable, clase 3).
      this.elegidas.update((prev) =>
        prev.filter((elegida) => this.clave(elegida) !== this.clave(butaca)),
      );
    } else {
      if (this.elegidas().length >= MAXIMO_BUTACAS) {
        this.aviso.set(`Se pueden comprar hasta ${MAXIMO_BUTACAS} butacas por compra.`);
        return;
      }
      // El precio se calcula al elegirla, para mostrarlo en el resumen. Es
      // informativo: al pagar, la base lo vuelve a calcular (D-39).
      const precio = this.comprasSrv.precioDe(butaca, datos.funcion, datos.pelicula);
      this.elegidas.update((prev) => [...prev, { ...butaca, precio }]);
    }
    this.sumar();
  }

  // Las dos se llaman desde el template, una vez por butaca, para decidir
  // qué clases lleva cada botón.
  estaOcupada(butaca: Butaca): boolean {
    return this.ocupadas().includes(this.clave(butaca));
  }

  estaElegida(butaca: Butaca): boolean {
    return this.elegidas().some((elegida) => this.clave(elegida) === this.clave(butaca));
  }

  // Lo que llega por Realtime: alguien compró esa butaca. Pasa a ocupada,
  // y si el comprador la tenía elegida, se le desmarca y se le avisa.
  private marcarOcupada(butaca: ButacaOcupada) {
    const clave = this.clave(butaca);
    // Con la propia compra también llega el aviso: si ya está, no se repite.
    if (!this.ocupadas().includes(clave)) {
      this.ocupadas.update((prev) => [...prev, clave]);
    }

    if (this.elegidas().some((elegida) => this.clave(elegida) === clave)) {
      this.elegidas.update((prev) => prev.filter((elegida) => this.clave(elegida) !== clave));
      this.sumar();
      this.aviso.set(
        `La butaca ${butaca.fila}${butaca.numero} acaba de ser comprada por otra persona y se quitó de tu selección. Elegí otra.`,
      );
    }
  }

  private sumar() {
    let total = 0;
    for (const elegida of this.elegidas()) total += elegida.precio;
    this.total.set(total);
  }

  // Identifica una butaca dentro de la sala: 'A-5'.
  private clave(butaca: { fila: string; numero: number }): string {
    return `${butaca.fila}-${butaca.numero}`;
  }

  // Los motivos por los que una función no se puede comprar. Son los
  // mismos controles que hace realizar_compra en la base (D-39): acá se
  // adelantan para no mostrar un mapa que después no deja pagar.
  private porQueNoSeVende(datos: FuncionParaComprar): string | null {
    // Una película oculta se puede leer, pero no está ofrecida (D-34).
    if (!datos.pelicula.visible) return 'Esta película no está disponible para la venta.';

    if (new Date(datos.funcion.fecha_hora) <= new Date()) {
      return 'Esta función ya empezó: no se pueden comprar entradas.';
    }

    if (!this.comprasSrv.ventaAbierta(datos.pelicula)) {
      const inicio = this.comprasSrv.inicioDeVenta(datos.pelicula);
      return `La venta de esta película todavía no está abierta. Abre el ${diaParaMostrar(inicio)}.`;
    }
    return null;
  }
}
