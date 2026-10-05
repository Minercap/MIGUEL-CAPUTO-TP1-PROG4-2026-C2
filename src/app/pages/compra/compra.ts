import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Compras, MAXIMO_BUTACAS } from '../../services/compras';
import { Pago } from '../../components/pago/pago';
import { Entrada } from '../../components/entrada/entrada';
import {
  Butaca,
  ButacaElegida,
  ButacaOcupada,
  CompraConfirmada,
  DatosDePago,
  FuncionParaComprar,
} from '../../interfaces/compra';
import { diaParaMostrar } from '../../validadores/validadores';

// Los tres pasos de la compra, en orden.
type PasoDeCompra = 'mapa' | 'pago' | 'entrada';

// Compra de entradas para una función (R-13 a R-16, R-20). La pantalla
// tiene un encabezado con los datos de la función y tres pasos:
//   mapa     elegir butacas, con las ocupadas en tiempo real;
//   pago     el formulario de pago (componente Pago);
//   entrada  la compra confirmada, con QR y PDF (componente Entrada).
// Esta pantalla guarda el estado de la compra y es la que llama a la base;
// los dos componentes hijos solo muestran y avisan (clase 3).
// No lleva guard: se puede comprar sin cuenta (R-02).
@Component({
  imports: [RouterLink, DatePipe, TitleCasePipe, Pago, Entrada],
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

  // Las butacas vendidas de esta función, tal como están en la tabla, con
  // su id: hace falta para saber cuál se liberó cuando llega un DELETE por
  // Realtime, que trae solo el id (ver escucharOcupadas en el servicio).
  ocupadas = signal<ButacaOcupada[]>([]);
  // Las que tiene elegidas el comprador, con su precio, y la suma.
  elegidas = signal<ButacaElegida[]>([]);
  total = signal(0);

  // En qué paso está la compra. La pantalla muestra una cosa u otra con un
  // @switch: el mapa, el formulario de pago o la entrada ya comprada.
  paso = signal<PasoDeCompra>('mapa');
  pagando = signal(false); // se está guardando la compra
  errorPago = signal<string | null>(null);
  // Lo que devolvió la base cuando la compra salió bien.
  compra = signal<CompraConfirmada | null>(null);

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
    this.ocupadas.set(ocupadas.datos);

    // Desde acá, cada butaca que se venda o se libere llega sola (R-16).
    // Los callbacks escriben signals: con OnPush, si escribieran campos
    // comunes la pantalla no se movería aunque el dato llegue (D-03).
    this.comprasSrv.escucharOcupadas(
      this.funcionId,
      (butaca) => this.marcarOcupada(butaca),
      (id) => this.marcarLibre(id),
    );

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

  // ---------- Los pasos ----------

  irAlPago() {
    if (this.elegidas().length === 0) {
      this.aviso.set('Elegí al menos una butaca para continuar.');
      return;
    }
    this.aviso.set(null);
    this.errorPago.set(null);
    this.paso.set('pago');
  }

  volverAlMapa() {
    this.errorPago.set(null);
    this.paso.set('mapa');
  }

  // Lo que llega del componente de pago por su output (clase 3): el mail,
  // el medio y la fecha de nacimiento, ya validados. Acá se arma el pedido
  // y se llama a la base.
  async pagar(pago: DatosDePago) {
    // pagando() evita el doble envío.
    if (this.pagando()) return;
    this.errorPago.set(null);
    this.aviso.set(null);
    this.pagando.set(true);

    // A la base van solo la fila y el número de cada butaca. Los precios
    // no: los calcula ella (D-39).
    const resultado = await this.comprasSrv.realizarCompra({
      funcion_id: this.funcionId,
      butacas: this.elegidas().map((elegida) => ({ fila: elegida.fila, numero: elegida.numero })),
      email: pago.email,
      medio_pago: pago.medio_pago,
      fecha_nacimiento: pago.fecha_nacimiento,
    });

    this.pagando.set(false);

    if (resultado.error || !resultado.datos) {
      this.errorPago.set(resultado.error);
      // Si falló porque alguien compró antes alguna de las butacas, esas
      // ya figuran como ocupadas: se sacan de la selección para que el
      // mapa no las muestre elegidas y ocupadas a la vez.
      this.quitarOcupadasDeLaSeleccion();
      return;
    }

    this.compra.set(resultado.datos);
    this.elegidas.set([]);
    this.total.set(0);
    this.paso.set('entrada');
  }

  // Las dos se llaman desde el template, una vez por butaca, para decidir
  // qué clases lleva cada botón.
  estaOcupada(butaca: Butaca): boolean {
    return this.ocupadas().some((ocupada) => this.clave(ocupada) === this.clave(butaca));
  }

  estaElegida(butaca: Butaca): boolean {
    return this.elegidas().some((elegida) => this.clave(elegida) === this.clave(butaca));
  }

  // Lo que llega por Realtime: alguien compró esa butaca. Pasa a ocupada,
  // y si el comprador la tenía elegida, se le desmarca y se le avisa.
  private marcarOcupada(butaca: ButacaOcupada) {
    const clave = this.clave(butaca);
    // Con la propia compra también llega el aviso: si ya está, no se repite.
    if (!this.ocupadas().some((ocupada) => ocupada.id === butaca.id)) {
      this.ocupadas.update((prev) => [...prev, butaca]);
    }

    // Mientras se está pagando, o con la compra ya hecha, los avisos que
    // llegan pueden ser los de la propia compra: no se toca la selección.
    // Si en ese momento la butaca la compró otra persona, la base rechaza
    // el pago y pagar() limpia la selección.
    if (this.pagando() || this.paso() === 'entrada') return;

    if (this.elegidas().some((elegida) => this.clave(elegida) === clave)) {
      this.elegidas.update((prev) => prev.filter((elegida) => this.clave(elegida) !== clave));
      this.sumar();
      this.aviso.set(
        `La butaca ${butaca.fila}${butaca.numero} acaba de ser comprada por otra persona y se quitó de tu selección. Elegí otra.`,
      );
      // Si estaba en el pago y se quedó sin butacas, vuelve al mapa.
      if (this.elegidas().length === 0) this.paso.set('mapa');
    }
  }

  // Saca de la selección las butacas que ya figuran como ocupadas.
  private quitarOcupadasDeLaSeleccion() {
    this.elegidas.update((prev) => prev.filter((elegida) => !this.estaOcupada(elegida)));
    this.sumar();
  }

  // Lo que llega por Realtime cuando se borra una fila de ButacasOcupadas:
  // una cancelación liberó esa butaca. Llegan los borrados de todas las
  // funciones y solo con el id, así que se busca entre las ocupadas de
  // esta: si está, se saca y la butaca vuelve a verse libre; si no está,
  // era de otra función y el filter no encuentra nada que sacar.
  private marcarLibre(id: number) {
    this.ocupadas.update((prev) => prev.filter((ocupada) => ocupada.id !== id));
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
