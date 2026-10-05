import { Component, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Auth } from '../../services/auth';
import { ButacaElegida, DatosDePago, MedioPago } from '../../interfaces/compra';
import { CampoFecha } from '../campo-fecha/campo-fecha';
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

// Paso de pago de la compra (A-01): el detalle final de lo que se compra y
// un formulario reactivo (clase 4) con el medio de pago. El pago es
// simulado: no se cobra nada y los datos de la tarjeta no se guardan ni se
// mandan a ningún lado; se validan y se descartan.
//
// Es un componente hijo de la pantalla de compra (clase 3). Recibe por
// input() lo que tiene que mostrar, y avisa por output() cuando el
// comprador confirma o quiere volver al mapa. No llama a la base: eso lo
// hace la pantalla.
@Component({
  imports: [ReactiveFormsModule, CampoFecha],
  selector: 'app-pago',
  styleUrl: './pago.css',
  templateUrl: './pago.html',
})
export class Pago {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);

  // Lo que manda la pantalla de compra.
  elegidas = input<ButacaElegida[]>([]);
  total = input(0);
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

  // Ningún campo lleva Validators.required salvo el medio de pago: que los
  // demás sean obligatorios depende de otra cosa (si hay sesión, si la
  // película tiene restricción, si se paga con tarjeta). Esas reglas van
  // como validadores del formulario entero (D-17). Los validadores de cada
  // campo solo miran el formato, y un campo vacío no les da error.
  formulario = this.fb.group(
    {
      email: ['', [email()]],
      // Grupo anidado para el componente campo-fecha (D-23), con los
      // mismos validadores que la fecha de nacimiento del registro.
      fecha_nacimiento: this.fb.group(
        { dia: [''], mes: [''], anio: [''] },
        { validators: [fechaReal(), fechaHasta(this.fechaMaxima), fechaDesde(this.fechaMinima)] },
      ),
      medio_pago: ['', [Validators.required, unoDe(this.valoresDeMedios)]],
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
        this.tarjetaObligatoria(),
      ],
    },
  );

  // ---------- Qué se le pide a cada comprador ----------
  // Son métodos y no campos porque dependen de la sesión, del input y del
  // medio elegido, que pueden cambiar con la pantalla abierta.

  // Sin sesión es una compra anónima (R-02).
  sinSesion(): boolean {
    return this.auth.usuarioActual() === null;
  }

  // La fecha de nacimiento se pide solo en la compra anónima de una
  // película con restricción (D-06). Con sesión, la base usa la del perfil.
  pideNacimiento(): boolean {
    return this.sinSesion() && this.restriccion() !== null;
  }

  pagaConTarjeta(): boolean {
    const medio = this.formulario.controls.medio_pago.value;
    return medio === 'credito' || medio === 'debito';
  }

  // ---------- Validadores del formulario entero (D-17) ----------
  // Son métodos del componente porque necesitan leer la sesión y el input.

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

  // Pagando con tarjeta, sus cuatro datos son obligatorios. Con Mercado
  // Pago no se piden.
  tarjetaObligatoria(): ValidatorFn {
    return (grupo: AbstractControl) => {
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

  confirmar() {
    if (this.formulario.invalid || this.enviando()) return;
    const v = this.formulario.getRawValue();

    // El validador unoDe ya garantiza que sea uno de la lista. Buscarlo ahí
    // le da el tipo MedioPago en lugar de un texto cualquiera.
    const medio = this.medios.find((opcion) => opcion.valor === v.medio_pago);
    if (!medio) return;

    // Lo que sale del componente: el mail y la fecha solo si corresponden.
    // Los datos de la tarjeta no salen de acá.
    this.pagar.emit({
      email: this.sinSesion() ? normalizarEmail(v.email ?? '') : null,
      medio_pago: medio.valor,
      fecha_nacimiento: this.pideNacimiento()
        ? fechaATexto({
            dia: v.fecha_nacimiento.dia ?? '',
            mes: v.fecha_nacimiento.mes ?? '',
            anio: v.fecha_nacimiento.anio ?? '',
          })
        : null,
    });
  }

  private armarAnios(): string[] {
    const actual = new Date().getFullYear();
    const lista: string[] = [];
    for (let anio = actual; anio <= actual + 15; anio++) lista.push(String(anio));
    return lista;
  }
}
