import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Funciones } from '../../services/funciones';
import { Peliculas } from '../../services/peliculas';
import {
  Formato,
  Funcion,
  FuncionAsignada,
  Idioma,
  ResultadoFunciones,
} from '../../interfaces/funcion';
import { Pelicula } from '../../interfaces/pelicula';
import { FechaPartes } from '../../interfaces/fecha-partes';
import { CampoFecha } from '../../components/campo-fecha/campo-fecha';
import {
  armarFecha,
  cantidadMarcados,
  fechaATexto,
  fechaParaMostrar,
  fechaReal,
  hoy,
  mayorQue,
  precio,
  rangoDeFechas,
  sumarDias,
  textoAFecha,
  unoDe,
} from '../../validadores/validadores';

// Un día de la semana del formulario. numero es el que usa Date.getDay():
// 0 domingo, 1 lunes ... 6 sábado.
interface DiaDeLaSemana {
  nombre: string;
  numero: number;
}

// Alta y edición de funciones (R-34) en un solo formulario reactivo
// (clase 4). La misma pantalla atiende /admin/funciones/nueva y
// /admin/funciones/:id, pero no cargan lo mismo:
//   - El alta es una programación (D-30): días de la semana, desde, hasta y
//     hora. De ahí sale una función por cada fecha.
//   - La edición es de una sola función: una fecha y una hora.
// En ninguna de las dos se elige la sala: la asigna el servicio (R-17).
// Las reglas de cada campo son las de docs/validaciones.md, sección 3.5.
@Component({
  imports: [ReactiveFormsModule, RouterLink, CampoFecha],
  selector: 'app-admin-funcion-formulario',
  styleUrl: './admin-funcion-formulario.css',
  templateUrl: './admin-funcion-formulario.html',
})
export class AdminFuncionFormulario implements OnInit {
  private fb = inject(FormBuilder);
  private funcionesSrv = inject(Funciones);
  private peliculasSrv = inject(Peliculas);
  private ruta = inject(ActivatedRoute);

  // El :id de la URL (D-20). En /nueva no hay parámetro y queda null.
  // No es un signal porque no cambia mientras la pantalla está abierta.
  private idDeLaUrl = this.ruta.snapshot.paramMap.get('id');
  id = this.idDeLaUrl === null ? null : Number(this.idDeLaUrl);
  private esAlta = this.id === null;

  // Estado que lee el template: va en signals (D-03).
  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  errorCarga = signal<string | null>(null); // no se pudo armar el formulario
  error = signal<string | null>(null); // no se pudo guardar
  aviso = signal<string | null>(null); // se guardó, pero falló el log
  avisoPrecios = signal<string | null>(null); // no se pudieron precargar los precios
  enviando = signal(false);
  // Lo que quedó guardado y en qué sala. Mientras es null se muestra el
  // formulario; cuando llega, se muestra el resumen en su lugar. Así un
  // alta que ya salió bien no se puede enviar dos veces.
  asignadas = signal<FuncionAsignada[] | null>(null);

  // Las opciones de cada lista. Lunes primero, que es como se lee la semana.
  dias: DiaDeLaSemana[] = [
    { nombre: 'Lunes', numero: 1 },
    { nombre: 'Martes', numero: 2 },
    { nombre: 'Miércoles', numero: 3 },
    { nombre: 'Jueves', numero: 4 },
    { nombre: 'Viernes', numero: 5 },
    { nombre: 'Sábado', numero: 6 },
    { nombre: 'Domingo', numero: 0 },
  ];
  // Horario de 10:00 a 23:45, con minutos de 15 en 15 (D-23).
  horas = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
  minutos = ['00', '15', '30', '45'];
  formatos: Formato[] = ['2D', '3D', '4D', '5D'];
  idiomas: Idioma[] = ['castellano', 'subtitulada'];

  // Límites de las fechas. La primera función se puede cargar desde hoy y
  // hasta 30 días adelante; el rango entre "desde" y "hasta" es de 60 días
  // como mucho.
  private desdeMaximo = sumarDias(hoy(), 30);
  private rangoMaximoDias = 60;
  // Los años del desplegable: del actual al de la última fecha posible. Son
  // signals porque en la edición la lista se amplía para incluir el año que
  // ya tenía la función, y el template las lee.
  anioDesde = signal(hoy().getFullYear());
  anioHasta = signal(sumarDias(this.desdeMaximo, this.rangoMaximoDias).getFullYear());

  // La función como estaba al abrir la edición, para saber qué cambió, y
  // su fecha como 'AAAA-MM-DD'. En el alta quedan en null. No son signals
  // porque el template no las lee.
  private original: Funcion | null = null;
  private fechaOriginal: string | null = null;

  formulario = this.fb.group(
    {
      pelicula_id: ['', [Validators.required]],
      // Un checkbox por día de la semana, en el mismo orden que la lista
      // (FormArray, clase 4). Solo se usa en el alta: en la edición no se
      // muestra y no lleva validador.
      dias: this.fb.array(
        this.dias.map(() => this.fb.control(false)),
        this.esAlta ? [cantidadMarcados(1, 7)] : [],
      ),
      // Grupos anidados para el componente campo-fecha (D-23). En el alta,
      // "desde" es el primer día del rango; en la edición es la fecha de la
      // función.
      desde: this.fb.group(
        {
          dia: ['', [Validators.required]],
          mes: ['', [Validators.required]],
          anio: ['', [Validators.required]],
        },
        { validators: [fechaReal(), this.fechaPermitida()] },
      ),
      // "hasta" existe solo en el alta: en la edición no se muestra, y por
      // eso ahí sus desplegables no son obligatorios.
      hasta: this.fb.group(
        {
          dia: ['', this.esAlta ? [Validators.required] : []],
          mes: ['', this.esAlta ? [Validators.required] : []],
          anio: ['', this.esAlta ? [Validators.required] : []],
        },
        { validators: [fechaReal()] },
      ),
      hora: ['', [Validators.required, unoDe(this.horas)]],
      minutos: ['', [Validators.required, unoDe(this.minutos)]],
      formato: ['', [Validators.required, unoDe(this.formatos)]],
      idioma: ['', [Validators.required, unoDe(this.idiomas)]],
      precio_base: [null as number | null, [Validators.required, precio()]],
      precio_vip: [null as number | null, [Validators.required, precio()]],
    },
    // Validadores del grupo entero, porque cada uno mira dos campos (D-17):
    // el precio VIP contra el base, la fecha contra el estreno de la
    // película y, en el alta, "hasta" contra "desde".
    {
      validators: this.esAlta
        ? [
            mayorQue('precio_vip', 'precio_base'),
            this.noAntesDelEstreno(),
            rangoDeFechas('desde', 'hasta', this.rangoMaximoDias),
          ]
        : [mayorQue('precio_vip', 'precio_base'), this.noAntesDelEstreno()],
    },
  );

  // Validador del grupo { dia, mes, anio } de "desde": no puede ser
  // anterior a hoy ni de acá a más de 30 días. Es una regla del momento de
  // la carga (mismo criterio que D-26): en la edición, si la fecha es la
  // que la función ya tenía, no se vuelve a exigir. Si no, una función de
  // ayer no se podría editar ni para corregirle un precio.
  // Es un método del componente porque necesita leer fechaOriginal.
  fechaPermitida(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const fecha = armarFecha(grupo.value);
      if (fecha === null) return null;
      if (fechaATexto(grupo.value) === this.fechaOriginal) return null;
      if (fecha < hoy()) return { fechaMinima: true };
      return fecha > this.desdeMaximo ? { fechaMaxima: true } : null;
    };
  }

  // Validador del formulario entero (D-17): ninguna función puede ser
  // anterior al estreno de su película en el cine. Mira dos campos, la
  // película y "desde", que en el alta es la primera fecha del rango: si
  // esa no es anterior al estreno, ninguna lo es. La preventa adelanta la
  // venta, no las funciones.
  // El error lleva la fecha de estreno ya escrita, para mostrarla en el
  // mensaje. Es un método del componente porque necesita la lista de
  // películas.
  noAntesDelEstreno(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const peliculaId = Number(grupo.get('pelicula_id')?.value);
      const pelicula = this.peliculas().find((p) => p.id === peliculaId);
      const fecha = armarFecha(grupo.get('desde')?.value);
      if (!pelicula || fecha === null) return null;

      const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno));
      if (estreno === null || fecha >= estreno) return null;
      return { antesDelEstreno: fechaParaMostrar(pelicula.fecha_estreno) };
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get peliculaId() {
    return this.formulario.get('pelicula_id');
  }
  get diasForm() {
    return this.formulario.controls.dias;
  }
  // Con .controls devuelven el FormGroup, que es lo que recibe campo-fecha.
  get desde() {
    return this.formulario.controls.desde;
  }
  get hasta() {
    return this.formulario.controls.hasta;
  }
  get hora() {
    return this.formulario.get('hora');
  }
  get minutosForm() {
    return this.formulario.get('minutos');
  }
  get formato() {
    return this.formulario.get('formato');
  }
  get idioma() {
    return this.formulario.get('idioma');
  }
  get precioBase() {
    return this.formulario.get('precio_base');
  }
  get precioVip() {
    return this.formulario.get('precio_vip');
  }

  async ngOnInit() {
    const resultadoPeliculas = await this.peliculasSrv.traerTodas();
    if (resultadoPeliculas.error || !resultadoPeliculas.datos) {
      this.errorCarga.set(resultadoPeliculas.error);
      this.cargando.set(false);
      return;
    }
    const todas = resultadoPeliculas.datos;

    if (this.id === null) {
      this.peliculas.set(todas.filter((pelicula) => this.sePuedeProgramar(pelicula)));
      this.cargando.set(false);
      return;
    }

    const resultado = await this.funcionesSrv.traerUna(this.id);
    if (resultado.error || !resultado.datos) {
      this.errorCarga.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    const funcion = resultado.datos;

    // La película que ya tenía la función se ofrece siempre, aunque hoy no
    // se pueda programar: si no, su desplegable quedaría vacío.
    this.peliculas.set(
      todas.filter(
        (pelicula) => pelicula.id === funcion.pelicula_id || this.sePuedeProgramar(pelicula),
      ),
    );

    // new Date() pasa el instante guardado a la hora de acá, y de ahí salen
    // las partes para los desplegables.
    const inicio = new Date(funcion.fecha_hora);
    const partes: FechaPartes = {
      dia: String(inicio.getDate()),
      mes: String(inicio.getMonth() + 1),
      anio: String(inicio.getFullYear()),
    };

    // Lo que ya estaba guardado se anota antes de cargar el formulario: el
    // validador de la fecha lo lee, y patchValue vuelve a validar.
    this.original = funcion;
    this.fechaOriginal = fechaATexto(partes);

    // Si la función es de un año que el desplegable no ofrece, se amplía la
    // lista para que su fecha se vea elegida.
    if (inicio.getFullYear() < this.anioDesde()) this.anioDesde.set(inicio.getFullYear());
    if (inicio.getFullYear() > this.anioHasta()) this.anioHasta.set(inicio.getFullYear());

    // Vuelca la función en el formulario ya creado (D-21). Los select
    // trabajan con texto: el id y la hora se pasan a texto, y los minutos
    // con dos cifras ('0' pasa a '00'), que es como están en la lista.
    this.formulario.patchValue({
      pelicula_id: String(funcion.pelicula_id),
      desde: partes,
      hora: String(inicio.getHours()),
      minutos: String(inicio.getMinutes()).padStart(2, '0'),
      formato: funcion.formato,
      idioma: funcion.idioma,
      precio_base: funcion.precio_base,
      precio_vip: funcion.precio_vip,
    });

    this.cargando.set(false);
  }

  // Una función se carga para una película visible en el sitio, esté en
  // cartelera o en Próximamente (docs/validaciones.md, 3.5). Las de
  // Próximamente también: el día del estreno ya tienen que tener funciones
  // (D-27).
  private sePuedeProgramar(pelicula: Pelicula): boolean {
    return pelicula.visible;
  }

  // Al elegir la película en el alta, trae los precios de su última función
  // y los deja cargados (D-28). Si no tiene ninguna, no toca nada. En la
  // edición no se usa: ahí los precios son los de la función.
  async precargarPrecios() {
    if (this.id !== null) return;
    this.avisoPrecios.set(null);

    const peliculaId = Number(this.formulario.controls.pelicula_id.value);
    const resultado = await this.funcionesSrv.traerUltimaDePelicula(peliculaId);
    if (resultado.error) {
      this.avisoPrecios.set(resultado.error);
      return;
    }
    if (resultado.datos) {
      this.formulario.patchValue({
        precio_base: resultado.datos.precio_base,
        precio_vip: resultado.datos.precio_vip,
      });
    }
  }

  async guardar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.enviando()) return;

    const v = this.formulario.getRawValue();

    // Los validadores ya garantizan todo esto. Los chequeos quedan para que
    // cada valor tenga su tipo: una fecha y no un null, un Formato y no un
    // texto cualquiera.
    const desde = armarFecha(this.partes(v.desde));
    const formato = this.formatos.find((opcion) => opcion === v.formato);
    const idioma = this.idiomas.find((opcion) => opcion === v.idioma);
    if (desde === null || !formato || !idioma) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    const peliculaId = Number(v.pelicula_id);
    const hora = Number(v.hora);
    const minutos = Number(v.minutos);
    const precioBase = Number(v.precio_base);
    const precioVip = Number(v.precio_vip);

    let resultado: ResultadoFunciones;
    if (this.original === null) {
      // Alta: una programación. "hasta" está validada igual que "desde";
      // si no se pudiera armar, se toma un rango de un solo día.
      const hasta = armarFecha(this.partes(v.hasta)) ?? desde;
      resultado = await this.funcionesSrv.programar({
        pelicula_id: peliculaId,
        // De la lista de true/false a los números de los días marcados.
        dias: this.dias.filter((_dia, i) => v.dias[i]).map((dia) => dia.numero),
        desde,
        hasta,
        hora,
        minutos,
        formato,
        idioma,
        precio_base: precioBase,
        precio_vip: precioVip,
      });
    } else {
      // Edición: una sola función. La fecha y la hora elegidas se juntan en
      // un Date, en la hora de acá.
      resultado = await this.funcionesSrv.modificar(this.original, {
        pelicula_id: peliculaId,
        inicio: new Date(desde.getFullYear(), desde.getMonth(), desde.getDate(), hora, minutos),
        formato,
        idioma,
        precio_base: precioBase,
        precio_vip: precioVip,
      });
    }

    this.enviando.set(false);

    if (!resultado.hecho) {
      this.error.set(resultado.error);
      return;
    }
    // Se guardó. Si además falló el log (D-14), se avisa junto al resumen.
    this.aviso.set(resultado.error);
    this.asignadas.set(resultado.asignadas);
  }

  // El valor de un grupo de fecha como FechaPartes: un desplegable sin
  // valor (null) se lee como "sin elegir".
  private partes(valor: { dia: string | null; mes: string | null; anio: string | null }): FechaPartes {
    return { dia: valor.dia ?? '', mes: valor.mes ?? '', anio: valor.anio ?? '' };
  }
}
