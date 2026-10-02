import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Peliculas } from '../../services/peliculas';
import { Genero, PeliculaPorCrear } from '../../interfaces/pelicula';
import { CampoFecha } from '../../components/campo-fecha/campo-fecha';
import {
  armarFecha,
  cantidadMarcados,
  entero,
  fechaATexto,
  fechaReal,
  hoy,
  imagen,
  largo,
  obligatorio,
  precio,
  sumarAnios,
  textoAFecha,
  textoLibre,
  unoDe,
} from '../../validadores/validadores';

// Alta y edición de películas (R-34) en un solo formulario reactivo
// (clase 4). La misma pantalla atiende /admin/peliculas/nueva y
// /admin/peliculas/:id: lo que cambia es si la URL trae un id o no.
// Las reglas de cada campo son las de docs/validaciones.md, sección 3.3.
@Component({
  imports: [ReactiveFormsModule, RouterLink, CampoFecha],
  selector: 'app-admin-pelicula-formulario',
  styleUrl: './admin-pelicula-formulario.css',
  templateUrl: './admin-pelicula-formulario.html',
})
export class AdminPeliculaFormulario implements OnInit {
  private fb = inject(FormBuilder);
  private peliculasSrv = inject(Peliculas);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);

  // El :id de la URL (D-20). En /nueva no hay parámetro y queda null.
  // No es un signal porque no cambia mientras la pantalla está abierta.
  private idDeLaUrl = this.ruta.snapshot.paramMap.get('id');
  id = this.idDeLaUrl === null ? null : Number(this.idDeLaUrl);

  // Estado que lee el template: va en signals (D-03).
  generos = signal<Genero[]>([]);
  cargando = signal(true);
  errorCarga = signal<string | null>(null); // no se pudo armar el formulario
  error = signal<string | null>(null); // no se pudo guardar
  aviso = signal<string | null>(null); // se guardó, pero falló un paso posterior
  enviando = signal(false);
  // URL del póster ya guardado, para mostrarlo y conservarlo si no se sube otro.
  posterActual = signal<string | null>(null);
  // Un alta que salió bien a medias no se puede reenviar: crearía otra película.
  bloqueado = signal(false);
  // El input de archivo no tiene "touched" porque no está atado al
  // formulario: se anota acá si ya se usó, para mostrar su error recién ahí.
  posterTocado = signal(false);

  // Los valores del select de restricción. El select trabaja con texto y se
  // convierte a número (o null) recién al guardar. "Ninguna" es una opción
  // más, y no el valor vacío, para que haya que elegirla: el campo es
  // obligatorio.
  restricciones = ['ninguna', '13', '18'];

  // Rango de la fecha de estreno: entre un año atrás y un año adelante.
  // Con las mismas dos fechas se arma la lista de años del desplegable. Son
  // signals porque en la edición la lista se amplía para incluir el año que
  // ya tenía la película, y el template las lee.
  private estrenoMinimo = sumarAnios(hoy(), -1);
  private estrenoMaximo = sumarAnios(hoy(), 1);
  anioDesde = signal(this.estrenoMinimo.getFullYear());
  anioHasta = signal(this.estrenoMaximo.getFullYear());

  // Lo que la película tenía guardado al abrir la edición (D-26). En el alta
  // quedan así: sin fecha y sin preventa. No son signals porque el template
  // no los lee: solo los consultan los validadores.
  private estrenoOriginal: string | null = null;
  private preventaOriginal = false;

  formulario = this.fb.group(
    {
      nombre: ['', [obligatorio(), largo(1, 100), textoLibre()]],
      // textoLibre(true): la sinopsis es un área de texto y acepta saltos
      // de línea.
      sinopsis: ['', [obligatorio(), largo(20, 1000), textoLibre(true)]],
      duracion_minutos: [null as number | null, [Validators.required, entero(30, 300)]],
      restriccion_edad: ['', [Validators.required, unoDe(this.restricciones)]],
      // Grupo anidado para el componente campo-fecha (D-23). Cada
      // desplegable es obligatorio, y las reglas que miran la fecha entera
      // van como validadores del grupo.
      fecha_estreno: this.fb.group(
        {
          dia: ['', [Validators.required]],
          mes: ['', [Validators.required]],
          anio: ['', [Validators.required]],
        },
        {
          validators: [fechaReal(), this.estrenoEnRango()],
        },
      ),
      en_cartelera: [false],
      proximamente: [false],
      preventa_habilitada: [false],
      precio_preventa: [null as number | null, [precio()]],
      // Un checkbox por género. Arranca vacío: los controles se agregan con
      // push cuando llega la lista de géneros (FormArray, clase 4).
      generos: this.fb.array<boolean>([], [cantidadMarcados(1, 4)]),
      // El archivo elegido. No está atado a un input con formControlName: lo
      // carga cargarPoster() (clase 7).
      poster: this.fb.control<File | null>(null, [imagen(2)]),
    },
    // Validadores del grupo entero, porque cada uno mira más de un campo, o
    // algo que está fuera del formulario (D-17).
    {
      validators: [
        this.precioDePreventaObligatorio(),
        this.preventaSoloConEstrenoFuturo(),
        this.posterObligatorio(),
      ],
    },
  );

  // Validador propio sobre el FormGroup (D-17): el precio de preventa es
  // obligatorio solo si la preventa está habilitada. El error queda en el
  // formulario, no en un campo, y se lee con formulario.errors.
  precioDePreventaObligatorio(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const habilitada: boolean = grupo.get('preventa_habilitada')?.value;
      const precio: number | null = grupo.get('precio_preventa')?.value;
      return habilitada && precio === null ? { precioDePreventaObligatorio: true } : null;
    };
  }

  // Validador del grupo { dia, mes, anio }: la fecha de estreno tiene que
  // estar entre un año atrás y un año adelante. Es una regla del momento de
  // la carga (D-26): en la edición, si la fecha es la que la película ya
  // tenía, no se vuelve a exigir. Si no, una película estrenada hace más de
  // un año no se podría editar nunca más.
  estrenoEnRango(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const estreno = armarFecha(grupo.value);
      if (estreno === null) return null;
      if (fechaATexto(grupo.value) === this.estrenoOriginal) return null;
      if (estreno < this.estrenoMinimo) return { fechaMinima: true };
      return estreno > this.estrenoMaximo ? { fechaMaxima: true } : null;
    };
  }

  // La preventa solo se puede habilitar antes del estreno. La regla se
  // aplica al habilitarla (D-26): si la película ya la tenía habilitada, la
  // edición no la bloquea aunque el estreno haya pasado. Que el precio
  // vuelva al normal después del estreno lo resuelve el sistema con la
  // fecha (R-11), sin que el admin tenga que destildar nada.
  // Mira dos campos, así que va en el grupo.
  preventaSoloConEstrenoFuturo(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const habilitada: boolean = grupo.get('preventa_habilitada')?.value;
      const estreno = armarFecha(grupo.get('fecha_estreno')?.value);
      if (!habilitada || this.preventaOriginal || estreno === null) return null;
      return estreno > hoy() ? null : { preventaSinEstrenoFuturo: true };
    };
  }

  // Toda película tiene una imagen (R-04): hace falta un archivo elegido o
  // un póster ya guardado. En el alta no hay póster guardado, así que hay
  // que elegir uno; en la edición alcanza con el que ya tenía.
  // Es un método del componente porque necesita leer posterActual.
  posterObligatorio(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const archivo: File | null = grupo.get('poster')?.value;
      return archivo === null && this.posterActual() === null ? { posterObligatorio: true } : null;
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get nombre() {
    return this.formulario.get('nombre');
  }
  get sinopsis() {
    return this.formulario.get('sinopsis');
  }
  get duracionMinutos() {
    return this.formulario.get('duracion_minutos');
  }
  get restriccionEdad() {
    return this.formulario.get('restriccion_edad');
  }
  // Con .controls devuelve el FormGroup, que es lo que recibe campo-fecha.
  get fechaEstreno() {
    return this.formulario.controls.fecha_estreno;
  }
  get precioPreventa() {
    return this.formulario.get('precio_preventa');
  }
  get generosForm() {
    return this.formulario.controls.generos;
  }
  get poster() {
    return this.formulario.get('poster');
  }

  async ngOnInit() {
    const resultadoGeneros = await this.peliculasSrv.traerGeneros();
    if (resultadoGeneros.error || !resultadoGeneros.datos) {
      this.errorCarga.set(resultadoGeneros.error);
      this.cargando.set(false);
      return;
    }
    const generos = resultadoGeneros.datos;

    // Un control por género, en el mismo orden que la lista: el checkbox
    // de la posición 3 corresponde al género de la posición 3.
    for (let i = 0; i < generos.length; i++) {
      this.generosForm.push(this.fb.control(false));
    }
    this.generos.set(generos);

    if (this.id !== null) {
      const resultado = await this.peliculasSrv.traerUna(this.id);
      if (resultado.error || !resultado.datos) {
        this.errorCarga.set(resultado.error);
        this.cargando.set(false);
        return;
      }
      const pelicula = resultado.datos;

      // Lo que ya estaba guardado se anota antes de cargar el formulario:
      // los validadores lo leen, y patchValue vuelve a validar.
      this.posterActual.set(pelicula.imagen_url);
      this.estrenoOriginal = pelicula.fecha_estreno;
      this.preventaOriginal = pelicula.preventa_habilitada;

      // Si la película es de un año que el desplegable no ofrece, se amplía
      // la lista para que su fecha se vea elegida.
      const anioOriginal = Number(textoAFecha(pelicula.fecha_estreno).anio);
      if (anioOriginal < this.anioDesde()) this.anioDesde.set(anioOriginal);
      if (anioOriginal > this.anioHasta()) this.anioHasta.set(anioOriginal);

      // Vuelca la película en el formulario ya creado (D-21). Los géneros
      // se pasan como una lista de true/false, uno por checkbox, y la fecha
      // como sus tres partes.
      this.formulario.patchValue({
        nombre: pelicula.nombre,
        sinopsis: pelicula.sinopsis,
        duracion_minutos: pelicula.duracion_minutos,
        restriccion_edad:
          pelicula.restriccion_edad === null ? 'ninguna' : String(pelicula.restriccion_edad),
        fecha_estreno: textoAFecha(pelicula.fecha_estreno),
        en_cartelera: pelicula.en_cartelera,
        proximamente: pelicula.proximamente,
        preventa_habilitada: pelicula.preventa_habilitada,
        precio_preventa: pelicula.precio_preventa,
        generos: generos.map((genero) => pelicula.generos_ids.includes(genero.id)),
      });
    }

    this.cargando.set(false);
  }

  // Guarda en el formulario el archivo elegido en el input (clase 7).
  cargarPoster(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.formulario.patchValue({ poster: input.files?.[0] ?? null });
    this.posterTocado.set(true);
  }

  async guardar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.bloqueado() || this.enviando()) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();

    // Primero el póster: si se eligió uno nuevo se sube y se usa su URL;
    // si no, se conserva el que ya tenía la película.
    let imagenUrl = this.posterActual();
    if (v.poster) {
      const subida = await this.peliculasSrv.subirPoster(v.poster);
      if (subida.error || !subida.datos) {
        this.error.set(subida.error);
        this.enviando.set(false);
        return;
      }
      imagenUrl = subida.datos;
      // Ya está subido: si después falla el guardado y se reintenta, no
      // hay que volver a subirlo.
      this.posterActual.set(imagenUrl);
      this.formulario.patchValue({ poster: null });
    }

    // El validador posterObligatorio ya garantiza que haya póster. El
    // chequeo queda para que imagenUrl sea un string y no un null.
    if (imagenUrl === null) {
      this.error.set('Elegí un póster para la película.');
      this.enviando.set(false);
      return;
    }

    // 'ninguna' queda en null: en la base, null es "sin restricción".
    let restriccionEdad: 13 | 18 | null = null;
    if (v.restriccion_edad === '13') restriccionEdad = 13;
    if (v.restriccion_edad === '18') restriccionEdad = 18;

    // Sirve para el alta y para la edición: PeliculaPorCrear y
    // PeliculaPorModificar tienen los mismos campos. Los textos van sin
    // espacios en los extremos, que es como los miraron los validadores.
    const pelicula: PeliculaPorCrear = {
      nombre: (v.nombre ?? '').trim(),
      sinopsis: (v.sinopsis ?? '').trim(),
      imagen_url: imagenUrl,
      duracion_minutos: Number(v.duracion_minutos),
      restriccion_edad: restriccionEdad,
      fecha_estreno: fechaATexto({
        dia: v.fecha_estreno.dia ?? '',
        mes: v.fecha_estreno.mes ?? '',
        anio: v.fecha_estreno.anio ?? '',
      }),
      en_cartelera: v.en_cartelera ?? false,
      proximamente: v.proximamente ?? false,
      preventa_habilitada: v.preventa_habilitada ?? false,
      precio_preventa: v.precio_preventa,
    };

    // De la lista de true/false a los ids de los géneros marcados.
    const generosIds = this.generos()
      .filter((_genero, i) => v.generos[i])
      .map((genero) => genero.id);

    const resultado =
      this.id === null
        ? await this.peliculasSrv.crear(pelicula, generosIds)
        : await this.peliculasSrv.modificar(this.id, pelicula, generosIds);

    this.enviando.set(false);

    if (!resultado.hecho) {
      this.error.set(resultado.error);
      return;
    }
    if (resultado.error) {
      // Se guardó, pero fallaron los géneros o el log (D-19): se avisa y se
      // queda en la pantalla. Si era un alta, se bloquea el reenvío.
      this.aviso.set(resultado.error);
      this.bloqueado.set(this.id === null);
      return;
    }
    this.router.navigateByUrl('/admin/peliculas');
  }
}
