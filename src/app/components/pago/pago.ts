import { Component, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
} from '@angular/forms';
import { Auth } from '../../services/auth';
import { Compras } from '../../services/compras';
import {
  ButacaElegida,
  DatosDePago,
  FuncionParaComprar,
  MedioPago,
  ProductoElegido,
  RecompensaParaCanjear,
  ResumenDeCompra,
} from '../../interfaces/compra';
import { Cupon } from '../../interfaces/cupon';
import { CampoFecha } from '../campo-fecha/campo-fecha';
import { ResumenCompra } from '../resumen-compra/resumen-compra';
import {
  armarFecha,
  codigoDeSeguridad,
  edadEnAnios,
  email,
  fechaATexto,
  fechaDesde,
  fechaHasta,
  fechaReal,
  hoy,
  largo,
  noVencida,
  normalizarEmail,
  numeroDeTarjeta,
  sumarAnios,
  textoPersona,
  unoDe,
} from '../../validadores/validadores';

// Una opción del desplegable de medio de pago: el valor que se guarda y el
// texto que se muestra.
interface OpcionDePago {
  valor: MedioPago;
  nombre: string;
}

// El crédito: un número con hasta dos decimales, sin signo.
const PATRON_CREDITO = /^\d+([.,]\d{1,2})?$/;

// Paso de pago de la compra (A-01): el resumen detallado de lo que se
// compra y un formulario reactivo (clase 4) con el medio de pago, y para
// el cliente registrado, los canjes de puntos y el crédito (D-45, D-47).
// El pago es simulado: no se cobra nada y los datos de la tarjeta no se
// guardan ni se mandan a ningún lado; se validan y se descartan.
//
// El resumen es una vista previa, con las mismas cuentas que la base: lo
// que vale es lo que devuelve realizar_compra al pagar.
//
// Es un componente hijo de la pantalla de compra (clase 3). Recibe por
// input() lo que tiene que mostrar, y avisa por output() cuando el
// comprador confirma o quiere volver. No llama a la base: eso lo hace la
// pantalla.
@Component({
  imports: [ReactiveFormsModule, CampoFecha, ResumenCompra],
  selector: 'app-pago',
  styleUrl: './pago.css',
  templateUrl: './pago.html',
})
export class Pago {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private comprasSrv = inject(Compras);

  // Lo que manda la pantalla de compra.
  datos = input<FuncionParaComprar | null>(null);
  elegidas = input<ButacaElegida[]>([]); // en el orden en que se eligieron
  candy = input<ProductoElegido[]>([]);
  // Para el cliente registrado: lo que puede canjear y el cupón que le
  // corresponde (D-41, D-45). Sin sesión llegan vacíos.
  recompensas = input<RecompensaParaCanjear[]>([]);
  cupon = input<Cupon | null>(null);
  // La restricción de edad de la película: 13, 18 o null.
  restriccion = input<number | null>(null);
  // true mientras la pantalla está guardando la compra: bloquea el botón.
  enviando = input(false);

  // Lo que se le avisa a la pantalla de compra.
  pagar = output<DatosDePago>();
  volver = output<void>();

  medios: OpcionDePago[] = [
    { valor: 'credito', nombre: 'Tarjeta de crédito' },
    { valor: 'debito', nombre: 'Tarjeta de débito' },
    { valor: 'mercado_pago', nombre: 'Mercado Pago' },
  ];
  // Los valores sueltos, para validar el desplegable contra sus opciones.
  private valoresDeMedios = this.medios.map((medio) => medio.valor);

  // Vencimiento de la tarjeta con dos desplegables, sin calendario (D-23).
  meses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  // Del año actual a 15 años adelante: una tarjeta no dura más que eso.
  aniosDeVencimiento = this.armarAnios();

  // Rango de la fecha de nacimiento, el mismo del registro: no futura y no
  // más de 120 años atrás.
  private fechaMaxima = hoy();
  private fechaMinima = sumarAnios(this.fechaMaxima, -120);
  anioDesde = this.fechaMinima.getFullYear();
  anioHasta = this.fechaMaxima.getFullYear();

  // Ningún campo lleva Validators.required: que sean obligatorios depende
  // de otra cosa (si hay sesión, si la película tiene restricción, si queda
  // algo por pagar, si se paga con tarjeta). Esas reglas van como
  // validadores del formulario entero (D-17). Los validadores de cada campo
  // solo miran el formato, y un campo vacío no les da error.
  formulario = this.fb.group(
    {
      email: ['', [email()]],
      // Grupo anidado para el componente campo-fecha (D-23), con los
      // mismos validadores que la fecha de nacimiento del registro.
      fecha_nacimiento: this.fb.group(
        { dia: [''], mes: [''], anio: [''] },
        { validators: [fechaReal(), fechaHasta(this.fechaMaxima), fechaDesde(this.fechaMinima)] },
      ),
      // Los canjes elegidos: un id de recompensa por canje (FormArray,
      // clase 4). Se agregan con push y se sacan con removeAt desde los
      // botones; no hay un input atado a cada uno.
      canjes: this.fb.array<number>([]),
      // Cuánto crédito quiere usar (validaciones.md 3.10).
      credito: ['0', [this.creditoValido()]],
      medio_pago: ['', [unoDe(this.valoresDeMedios)]],
      // Los datos de la tarjeta siguen docs/validaciones.md, sección 3.11.
      // El titular usa el mismo patrón de letras que el nombre del registro.
      titular: ['', [largo(2, 50), textoPersona()]],
      numero_tarjeta: ['', [numeroDeTarjeta()]],
      vencimiento: this.fb.group({ mes: [''], anio: [''] }, { validators: [noVencida()] }),
      codigo_seguridad: ['', [codigoDeSeguridad()]],
    },
    {
      validators: [
        this.emailObligatorio(),
        this.nacimientoObligatorio(),
        this.canjesPosibles(),
        this.medioObligatorio(),
        this.tarjetaObligatoria(),
      ],
    },
  );

  // ---------- Qué se le pide a cada comprador ----------
  // Son métodos y no campos porque dependen de la sesión, de los input y de
  // lo que se va eligiendo, que cambian con la pantalla abierta.

  // Sin sesión es una compra anónima (R-02): sin cupón, crédito ni puntos.
  sinSesion(): boolean {
    return this.auth.usuarioActual() === null;
  }

  // Los saldos del cliente, de su perfil.
  saldoPuntos(): number {
    return this.auth.perfil()?.puntos ?? 0;
  }

  saldoCredito(): number {
    return this.auth.perfil()?.credito ?? 0;
  }

  // La fecha de nacimiento se pide solo en la compra anónima de una
  // película con restricción (D-06). Con sesión, la base usa la del perfil.
  pideNacimiento(): boolean {
    return this.sinSesion() && this.restriccion() !== null;
  }

  // Si queda algo para cobrar con el medio de pago. Si el crédito y los
  // canjes cubren todo, no se pide medio ni tarjeta (D-47).
  hayQuePagar(): boolean {
    return (this.resumen()?.a_pagar ?? 1) > 0;
  }

  pagaConTarjeta(): boolean {
    const medio = this.formulario.controls.medio_pago.value;
    return this.hayQuePagar() && (medio === 'credito' || medio === 'debito');
  }

  // ---------- La vista previa (D-47) ----------

  // El resumen con lo que está elegido en este momento. Se llama desde el
  // template y desde los validadores: lo arma el servicio, con las mismas
  // cuentas que la base.
  resumen(): ResumenDeCompra | null {
    const v = this.formulario.getRawValue();
    return this.resumenDe(v.canjes, v.credito);
  }

  // Lo mismo, a partir de los valores que reciben los validadores. Devuelve
  // null mientras la pantalla de compra no mandó los datos de la función.
  private resumenDe(canjesIds: (number | null)[], credito: string | null): ResumenDeCompra | null {
    const datos = this.datos();
    if (datos === null) return null;
    return this.comprasSrv.calcularResumen({
      datos,
      butacas: this.elegidas(),
      candy: this.candy(),
      canjes: this.canjesElegidos(canjesIds),
      cupon: this.cupon(),
      credito: this.leerCredito(credito),
      conSesion: !this.sinSesion(),
    });
  }

  // De los ids del FormArray a las recompensas, en el mismo orden.
  private canjesElegidos(ids: (number | null)[]): RecompensaParaCanjear[] {
    const elegidos: RecompensaParaCanjear[] = [];
    for (const id of ids) {
      const recompensa = this.recompensas().find((r) => r.id === id);
      if (recompensa) elegidos.push(recompensa);
    }
    return elegidos;
  }

  // El texto del campo de crédito como número. Vacío o mal escrito cuenta
  // como 0: de avisar el error se ocupa el validador.
  private leerCredito(texto: string | null): number {
    const limpio = (texto ?? '').trim();
    if (!PATRON_CREDITO.test(limpio)) return 0;
    return Number(limpio.replace(',', '.'));
  }

  // ---------- Canjes de puntos (D-45) ----------

  puntosDisponibles(): number {
    return this.saldoPuntos() - (this.resumen()?.puntos_usados ?? 0);
  }

  // Butacas que todavía puede cubrir una entrada gratis: las que no cubre
  // ya un combo ni otra entrada gratis (D-46).
  butacasLibresParaCanje(): number {
    const r = this.resumen();
    if (r === null) return 0;
    return r.entradas.filter((e) => e.cubierta_por === null).length;
  }

  // Se puede canjear si alcanzan los puntos, y si es una entrada, si queda
  // una butaca para cubrir.
  sePuedeCanjear(recompensa: RecompensaParaCanjear): boolean {
    if (recompensa.costo_puntos > this.puntosDisponibles()) return false;
    return recompensa.tipo === 'producto' || this.butacasLibresParaCanje() > 0;
  }

  canjear(recompensa: RecompensaParaCanjear) {
    if (!this.sePuedeCanjear(recompensa)) return;
    this.formulario.controls.canjes.push(this.fb.control(recompensa.id));
  }

  quitarCanje(indice: number) {
    this.formulario.controls.canjes.removeAt(indice);
  }

  // ---------- Crédito (R-30) ----------

  // Lo que cuesta la compra antes del crédito: el máximo que tiene sentido
  // usar.
  totalAntesDelCredito(): number {
    return this.resumen()?.total ?? 0;
  }

  // Completa el campo con todo el crédito que se puede usar: el saldo, o el
  // total si es menor.
  usarTodoElCredito() {
    const maximo = Math.min(this.saldoCredito(), this.totalAntesDelCredito());
    this.formulario.patchValue({ credito: String(maximo) });
  }

  // ---------- Validadores (D-17) ----------
  // Son métodos del componente porque necesitan leer la sesión, los input
  // y el resumen.

  // El crédito: un número de 0 en adelante, con dos decimales como mucho,
  // y no más que el saldo (validaciones.md 3.10). Si pide más que el total
  // no es un error: se usa solo lo necesario, igual que en la base.
  creditoValido(): ValidatorFn {
    return (control: AbstractControl) => {
      const texto = String(control.value ?? '').trim();
      if (texto === '') return null;
      if (!PATRON_CREDITO.test(texto)) return { creditoFormato: true };
      const monto = Number(texto.replace(',', '.'));
      return monto > this.saldoCredito() ? { creditoInsuficiente: this.saldoCredito() } : null;
    };
  }

  // Sin sesión, el mail es obligatorio: es el dato que identifica al
  // comprador de una compra anónima (R-02).
  emailObligatorio(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const mail: string = grupo.get('email')?.value ?? '';
      return this.sinSesion() && mail.trim() === '' ? { emailObligatorio: true } : null;
    };
  }

  // En la compra anónima de una película con restricción, la fecha de
  // nacimiento es obligatoria y la edad tiene que alcanzar (R-25, D-06).
  // La base lo vuelve a controlar al pagar; acá se adelanta para avisar
  // antes. El error de la edad lleva la restricción, para el mensaje.
  nacimientoObligatorio(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const restriccion = this.restriccion();
      if (!this.sinSesion() || restriccion === null) return null;

      const nacimiento = armarFecha(grupo.get('fecha_nacimiento')?.value);
      if (nacimiento === null) return { nacimientoObligatorio: true };
      return edadEnAnios(nacimiento) < restriccion ? { edadInsuficiente: restriccion } : null;
    };
  }

  // Los canjes: que alcancen los puntos y que cada entrada gratis tenga su
  // butaca (D-45, D-46). Los botones ya lo impiden; esto cubre el caso en
  // que cambie algo después de canjear.
  canjesPosibles(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const r = this.resumenDe(grupo.get('canjes')?.value ?? [], grupo.get('credito')?.value ?? '0');
      if (r === null) return null;
      if (r.puntos_usados > this.saldoPuntos()) return { puntosInsuficientes: true };
      const cubiertas = r.entradas.filter((e) => e.cubierta_por !== null).length;
      let pedidas = r.canjes.filter((c) => c.tipo === 'entrada').length;
      for (const e of this.candy()) if (e.producto.incluye_entrada) pedidas += e.cantidad;
      return pedidas > cubiertas ? { faltanButacas: true } : null;
    };
  }

  // El medio de pago es obligatorio si queda algo para cobrar. Mientras no
  // llegaron los datos de la función no se sabe, y se pide.
  medioObligatorio(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const r = this.resumenDe(grupo.get('canjes')?.value ?? [], grupo.get('credito')?.value ?? '0');
      if (r !== null && r.a_pagar === 0) return null;
      const medio: string = grupo.get('medio_pago')?.value ?? '';
      return medio === '' ? { medioObligatorio: true } : null;
    };
  }

  // Pagando con tarjeta, sus cuatro datos son obligatorios. Con Mercado
  // Pago, o si no queda nada para cobrar, no se piden.
  tarjetaObligatoria(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const r = this.resumenDe(grupo.get('canjes')?.value ?? [], grupo.get('credito')?.value ?? '0');
      if (r !== null && r.a_pagar === 0) return null;
      const medio: string = grupo.get('medio_pago')?.value ?? '';
      if (medio !== 'credito' && medio !== 'debito') return null;

      const titular: string = grupo.get('titular')?.value ?? '';
      const numero: string = grupo.get('numero_tarjeta')?.value ?? '';
      const codigo: string = grupo.get('codigo_seguridad')?.value ?? '';
      const vencimiento: { mes: string; anio: string } = grupo.get('vencimiento')?.value;
      const falta =
        titular.trim() === '' ||
        numero.trim() === '' ||
        codigo.trim() === '' ||
        vencimiento.mes === '' ||
        vencimiento.anio === '';
      return falta ? { tarjetaIncompleta: true } : null;
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get email() {
    return this.formulario.get('email');
  }
  // Con .controls devuelve el FormGroup, que es lo que recibe campo-fecha.
  get fechaNacimiento() {
    return this.formulario.controls.fecha_nacimiento;
  }
  get credito() {
    return this.formulario.get('credito');
  }
  get medioPago() {
    return this.formulario.get('medio_pago');
  }
  get titular() {
    return this.formulario.get('titular');
  }
  get numeroTarjeta() {
    return this.formulario.get('numero_tarjeta');
  }
  get vencimiento() {
    return this.formulario.controls.vencimiento;
  }
  get codigoSeguridad() {
    return this.formulario.get('codigo_seguridad');
  }

  // Cuántas unidades del producto de un canje ya están en el pedido. 0 si
  // es una entrada o si el producto no está en el pedido.
  enElPedido(recompensaId: number | null): number {
    const recompensa = this.recompensas().find((r) => r.id === recompensaId);
    if (!recompensa || recompensa.producto_id === null) return 0;
    return this.candy().find((e) => e.producto.id === recompensa.producto_id)?.cantidad ?? 0;
  }

  // El nombre de la recompensa de cada canje elegido, para la lista.
  nombreDelCanje(id: number | null): string {
    return this.recompensas().find((r) => r.id === id)?.nombre ?? 'Recompensa';
  }

  confirmar() {
    if (this.formulario.invalid || this.enviando()) return;
    const v = this.formulario.getRawValue();

    // Si no queda nada para cobrar, el medio va en null y la base guarda
    // 'sin_cargo' (D-47). Si no, el validador unoDe ya garantiza que sea uno
    // de la lista: buscarlo ahí le da el tipo MedioPago.
    let medio: MedioPago | null = null;
    if (this.hayQuePagar()) {
      const opcion = this.medios.find((o) => o.valor === v.medio_pago);
      if (!opcion) return;
      medio = opcion.valor;
    }

    // Lo que sale del componente. Los datos de la tarjeta no salen de acá.
    this.pagar.emit({
      email: this.sinSesion() ? normalizarEmail(v.email ?? '') : null,
      medio_pago: medio,
      fecha_nacimiento: this.pideNacimiento()
        ? fechaATexto({
            dia: v.fecha_nacimiento.dia ?? '',
            mes: v.fecha_nacimiento.mes ?? '',
            anio: v.fecha_nacimiento.anio ?? '',
          })
        : null,
      canjes: this.sinSesion()
        ? []
        : v.canjes.filter((id) => id !== null).map((id) => ({ recompensa_id: Number(id) })),
      credito: this.sinSesion() ? 0 : this.leerCredito(v.credito),
    });
  }

  private armarAnios(): string[] {
    const actual = new Date().getFullYear();
    const lista: string[] = [];
    for (let anio = actual; anio <= actual + 15; anio++) lista.push(String(anio));
    return lista;
  }
}
