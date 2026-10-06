import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Cartelera } from '../../services/cartelera';
import { Compras } from '../../services/compras';
import { Auth } from '../../services/auth';
import { Alertas } from '../../services/alertas';
import { Notificaciones } from '../../services/notificaciones';
import { diaParaMostrar } from '../../validadores/validadores';
import { Alerta } from '../../interfaces/alerta';
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
  private comprasSrv = inject(Compras);
  private alertasSrv = inject(Alertas);
  private notificaciones = inject(Notificaciones);
  private ruta = inject(ActivatedRoute);
  // Público: el template pregunta si hay sesión.
  auth = inject(Auth);

  // El :id de /pelicula/:id (D-20). No es un signal porque no cambia
  // mientras la pantalla está abierta.
  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  // Estado que lee el template: va en signals (D-03).
  cargando = signal(true);
  error = signal<string | null>(null); // no se pudo cargar la película
  errorFunciones = signal<string | null>(null); // falló solo ese bloque
  pelicula = signal<PeliculaDeCartelera | null>(null);
  // Si la venta de la película todavía no abrió, el día en que abre, como
  // 'DD/MM'. null = ya se venden entradas.
  ventaDesde = signal<string | null>(null);

  // Las funciones futuras, agrupadas por día, y la clave del día elegido.
  dias = signal<DiaDeFunciones[]>([]);
  diaElegido = signal<string | null>(null);
  // Los horarios del día elegido: es lo que dibuja el template. Lo escribe
  // elegirDia().
  funcionesDelDia = signal<Funcion[]>([]);

  // La alerta de Próximamente (R-10, D-52). Solo se usa mientras la venta
  // no abrió.
  alerta = signal<Alerta | null>(null); // null = no la activó
  errorAlerta = signal<string | null>(null);
  activando = signal(false);
  // Después de activar la alerta: se pregunta si además quiere una
  // notificación en este dispositivo.
  preguntarPush = signal(false);
  suscribiendo = signal(false);
  mensajePush = signal<string | null>(null); // cómo se le va a avisar
  errorPush = signal<string | null>(null);

  async ngOnInit() {
    const resultado = await this.carteleraSrv.traerPelicula(this.id);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    this.pelicula.set(resultado.datos);

    // Si la venta todavía no abrió (R-11), los horarios se muestran pero
    // no llevan a la compra: dicen desde cuándo se vende. La regla es de
    // la película, así que vale para todos sus horarios.
    if (!this.comprasSrv.ventaAbierta(resultado.datos)) {
      const inicio = this.comprasSrv.inicioDeVenta(resultado.datos);
      // De 'DD/MM/AAAA' quedan los primeros cinco caracteres: 'DD/MM'.
      this.ventaDesde.set(diaParaMostrar(inicio).slice(0, 5));

      // Con sesión, se busca si ya tenía activada la alerta de esta
      // película. Se espera a auth.listo porque la página puede abrirse
      // antes de que termine de cargar la sesión guardada (D-13).
      await this.auth.listo;
      if (this.auth.usuarioActual()) {
        const alerta = await this.alertasSrv.traerMia(this.id);
        this.errorAlerta.set(alerta.error);
        this.alerta.set(alerta.datos);
      }
    }

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

  // Activa la alerta. Se guarda siempre; la notificación push es un paso
  // aparte y opcional (D-52).
  async activarAlerta() {
    if (this.activando()) return;
    this.errorAlerta.set(null);
    this.activando.set(true);

    const resultado = await this.alertasSrv.activar(this.id);
    if (resultado.error || !resultado.datos) {
      this.activando.set(false);
      this.errorAlerta.set(resultado.error);
      return;
    }
    this.alerta.set(resultado.datos);

    // ¿Este dispositivo ya recibe notificaciones?
    //   Sí: no se pregunta nada. suscribir() no vuelve a pedir permiso;
    //       solo comprueba que la suscripción esté guardada para este
    //       usuario.
    //   No: se le pregunta si quiere recibirlas.
    if (await this.notificaciones.tieneSuscripcion()) {
      const error = await this.notificaciones.suscribir();
      this.errorPush.set(error);
      if (!error) this.mensajePush.set('Te vamos a avisar con una notificación.');
    } else {
      this.preguntarPush.set(true);
    }
    this.activando.set(false);
  }

  // "Sí, avisame": pide el permiso y guarda la suscripción.
  async aceptarPush() {
    if (this.suscribiendo()) return;
    this.errorPush.set(null);
    this.suscribiendo.set(true);

    const error = await this.notificaciones.suscribir();

    this.suscribiendo.set(false);
    this.preguntarPush.set(false);
    // Si falla, la alerta sigue activa: el aviso le llega dentro de la app.
    this.errorPush.set(error);
    if (!error) this.mensajePush.set('Te vamos a avisar con una notificación.');
  }

  // "Solo en la app": no se pide ningún permiso.
  rechazarPush() {
    this.preguntarPush.set(false);
    this.mensajePush.set('Vas a ver el aviso cuando entres a la app.');
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
