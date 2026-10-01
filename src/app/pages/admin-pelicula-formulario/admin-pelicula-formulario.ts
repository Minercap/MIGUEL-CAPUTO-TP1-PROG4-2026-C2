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

// Alta y edición de películas (R-34) en un solo formulario reactivo
// (clase 4). La misma pantalla atiende /admin/peliculas/nueva y
// /admin/peliculas/:id: lo que cambia es si la URL trae un id o no.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
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

  formulario = this.fb.group(
    {
      nombre: ['', [Validators.required]],
      sinopsis: [''],
      duracion_minutos: [
        null as number | null,
        [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
      ],
      // El select trabaja con texto: '' es "ninguna", y también '13' y '18'.
      // Se convierte a número (o null) recién al guardar.
      restriccion_edad: [''],
      fecha_estreno: [''],
      en_cartelera: [false],
      proximamente: [false],
      preventa_habilitada: [false],
      precio_preventa: [null as number | null, [Validators.min(0)]],
      // Un checkbox por género. Arranca vacío: los controles se agregan con
      // push cuando llega la lista de géneros (FormArray, clase 4).
      generos: this.fb.array<boolean>([], [this.alMenosUnGenero()]),
      // El archivo elegido. No está atado a un input con formControlName: lo
      // carga cargarPoster() (clase 7).
      poster: this.fb.control<File | null>(null),
    },
    // Validador del grupo entero, porque mira dos campos a la vez (D-17).
    { validators: [this.precioDePreventaObligatorio()] },
  );

  // Validador propio sobre el FormArray: la regla es sobre la lista
  // completa de checkboxes, no sobre uno en particular.
  alMenosUnGenero(): ValidatorFn {
    return (control: AbstractControl) => {
      const marcados: boolean[] = control.value;
      return marcados.some((marcado) => marcado) ? null : { sinGeneros: true };
    };
  }

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

  // Getters para leer cada campo desde el template (clase 4).
  get nombre() {
    return this.formulario.get('nombre');
  }
  get duracionMinutos() {
    return this.formulario.get('duracion_minutos');
  }
  get precioPreventa() {
    return this.formulario.get('precio_preventa');
  }
  get generosForm() {
    return this.formulario.controls.generos;
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

      // Vuelca la película en el formulario ya creado (D-21). Los géneros
      // se pasan como una lista de true/false, uno por checkbox.
      this.formulario.patchValue({
        nombre: pelicula.nombre,
        sinopsis: pelicula.sinopsis ?? '',
        duracion_minutos: pelicula.duracion_minutos,
        restriccion_edad: pelicula.restriccion_edad === null ? '' : String(pelicula.restriccion_edad),
        fecha_estreno: pelicula.fecha_estreno ?? '',
        en_cartelera: pelicula.en_cartelera,
        proximamente: pelicula.proximamente,
        preventa_habilitada: pelicula.preventa_habilitada,
        precio_preventa: pelicula.precio_preventa,
        generos: generos.map((genero) => pelicula.generos_ids.includes(genero.id)),
      });
      this.posterActual.set(pelicula.imagen_url);
    }

    this.cargando.set(false);
  }

  // Guarda en el formulario el archivo elegido en el input (clase 7).
  cargarPoster(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.formulario.patchValue({ poster: input.files?.[0] ?? null });
  }

  async guardar() {
    if (this.formulario.invalid || this.bloqueado()) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();

    // Primero el póster: si se eligió uno nuevo se sube y se usa su URL;
    // si no, se conserva el que ya tenía la película (o ninguno).
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

    let restriccionEdad: 13 | 18 | null = null;
    if (v.restriccion_edad === '13') restriccionEdad = 13;
    if (v.restriccion_edad === '18') restriccionEdad = 18;

    // Sirve para el alta y para la edición: PeliculaPorCrear y
    // PeliculaPorModificar tienen los mismos campos.
    const pelicula: PeliculaPorCrear = {
      nombre: v.nombre ?? '',
      sinopsis: v.sinopsis || null,
      imagen_url: imagenUrl,
      duracion_minutos: Number(v.duracion_minutos),
      restriccion_edad: restriccionEdad,
      fecha_estreno: v.fecha_estreno || null,
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
