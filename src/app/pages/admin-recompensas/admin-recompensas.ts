import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Recompensas } from '../../services/recompensas';
import { Productos } from '../../services/productos';
import { Recompensa, RecompensaPorCrear, TipoRecompensa } from '../../interfaces/recompensa';
import { Producto } from '../../interfaces/producto';
import { entero, unoDe } from '../../validadores/validadores';

// Recompensas del programa de puntos (R-28, D-42): el formulario arriba y
// la lista debajo, en la misma pantalla. "Editar" carga la recompensa en el
// formulario, igual que los cupones.
// Las reglas de cada campo son las de docs/validaciones.md, sección 3.8.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-recompensas',
  styleUrl: './admin-recompensas.css',
  templateUrl: './admin-recompensas.html',
})
export class AdminRecompensas implements OnInit {
  private fb = inject(FormBuilder);
  private recompensasSrv = inject(Recompensas);
  private productosSrv = inject(Productos);

  // Estado que lee el template: va en signals (D-03).
  recompensas = signal<Recompensa[]>([]);
  // Todos los productos, también los inactivos y los combos: hacen falta
  // para mostrar el nombre de cualquier recompensa ya cargada.
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  enviando = signal(false);
  // La recompensa que está cargada en el formulario. null = alta.
  idEditando = signal<number | null>(null);
  idPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  // Los valores del select de tipo, para el validador unoDe.
  tipos: TipoRecompensa[] = ['entrada', 'producto'];

  // Los valores con los que arranca el formulario, también para reset()
  // (D-44): sin argumentos dejaría "activa" en null.
  private valoresIniciales = { tipo: '', producto_id: '', costo_puntos: null, activa: true };

  formulario = this.fb.group(
    {
      tipo: ['', [Validators.required, unoDe(this.tipos)]],
      // Texto, porque es lo que maneja el <select>. Se convierte a número
      // al guardar.
      producto_id: ['', [this.productoOfrecido()]],
      costo_puntos: [null as number | null, [Validators.required, entero(1, 100000)]],
      // Arranca marcada: una recompensa nueva se crea para ofrecerla.
      activa: [true],
    },
    // Mira dos campos (tipo y producto_id), así que va en el grupo (D-17).
    { validators: [this.productoSegunTipo()] },
  );

  // Lo que se ofrece en el selector: productos activos que no son combo,
  // porque el mail del 03/03 habla de "productos del candy bar". En la
  // edición se suma el que la recompensa ya tenía, aunque se haya
  // desactivado, para que se vea elegido.
  opcionesProducto(): Producto[] {
    const actual = this.recompensas().find((r) => r.id === this.idEditando())?.producto_id;
    return this.productos().filter((p) => !p.es_combo && (p.activo || p.id === actual));
  }

  // El producto elegido tiene que ser uno de los ofrecidos (validaciones.md,
  // principio 4): el <select> se puede cambiar desde la consola. Es un
  // método del componente porque necesita leer los signals.
  productoOfrecido(): ValidatorFn {
    return (control: AbstractControl) => {
      const elegido = String(control.value ?? '');
      if (elegido === '') return null;
      return this.opcionesProducto().some((p) => String(p.id) === elegido)
        ? null
        : { productoNoOfrecido: true };
    };
  }

  // Si el tipo es producto, hay que elegir cuál (3.8). Es el mismo check
  // cruzado que tiene la base (D-42).
  productoSegunTipo(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const tipo: string = grupo.get('tipo')?.value ?? '';
      const producto: string = grupo.get('producto_id')?.value ?? '';
      return tipo === 'producto' && producto === '' ? { productoObligatorio: true } : null;
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get tipo() {
    return this.formulario.get('tipo');
  }
  get productoId() {
    return this.formulario.get('producto_id');
  }
  get costoPuntos() {
    return this.formulario.get('costo_puntos');
  }
  get esProducto(): boolean {
    return this.formulario.controls.tipo.value === 'producto';
  }

  async ngOnInit() {
    const recompensas = await this.recompensasSrv.traerTodas();
    const productos = await this.productosSrv.traerTodos();
    this.cargando.set(false);

    if (recompensas.error || !recompensas.datos) {
      this.error.set(recompensas.error);
      return;
    }
    if (productos.error || !productos.datos) {
      this.error.set(productos.error);
      return;
    }
    this.recompensas.set(recompensas.datos);
    this.productos.set(productos.datos);
  }

  // El nombre que se muestra y que va al log: "Entrada" o el del producto.
  nombreDe(recompensa: RecompensaPorCrear): string {
    if (recompensa.tipo === 'entrada') return 'Entrada';
    return (
      this.productos().find((p) => p.id === recompensa.producto_id)?.nombre ??
      'Producto desconocido'
    );
  }

  // Al pasar a "entrada" se vacía el producto: una entrada no apunta a
  // ninguno (check cruzado de la base, D-42).
  alCambiarTipo() {
    if (!this.esProducto) this.formulario.patchValue({ producto_id: '' });
  }

  // Carga la recompensa en el formulario de arriba (D-21).
  editar(recompensa: Recompensa) {
    this.error.set(null);
    this.idPorBorrar.set(null);
    this.idEditando.set(recompensa.id);
    this.formulario.patchValue({
      tipo: recompensa.tipo,
      producto_id: recompensa.producto_id === null ? '' : String(recompensa.producto_id),
      costo_puntos: recompensa.costo_puntos,
      activa: recompensa.activa,
    });
  }

  // Vuelve al alta: el formulario queda vacío y sin tocar (D-44).
  cancelarEdicion() {
    this.idEditando.set(null);
    this.formulario.reset(this.valoresIniciales);
  }

  async guardar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.enviando()) return;

    this.error.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();
    const tipo: TipoRecompensa = v.tipo === 'producto' ? 'producto' : 'entrada';
    // Sirve para el alta y para la edición: los dos tienen los mismos
    // campos. Si es una entrada, producto_id va en null (D-42).
    const recompensa: RecompensaPorCrear = {
      tipo,
      producto_id: tipo === 'producto' ? Number(v.producto_id) : null,
      costo_puntos: Number(v.costo_puntos),
      activa: v.activa ?? true,
    };
    const nombre = this.nombreDe(recompensa);

    const id = this.idEditando();
    if (id === null) {
      const resultado = await this.recompensasSrv.crear(recompensa, nombre);
      this.enviando.set(false);
      // Si se creó pero falló el log, viene la recompensa y también el aviso.
      this.error.set(resultado.error);
      const creada = resultado.datos;
      if (creada) {
        // Inmutable, y ordenada como la trae el servicio (clase 3).
        this.recompensas.update((prev) =>
          [...prev, creada].sort((a, b) => a.costo_puntos - b.costo_puntos),
        );
        this.formulario.reset(this.valoresIniciales);
      }
      return;
    }

    const resultado = await this.recompensasSrv.modificar(id, recompensa, nombre);
    this.enviando.set(false);
    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.recompensas.update((prev) =>
        prev
          .map((r) => (r.id === id ? { id, ...recompensa } : r))
          .sort((a, b) => a.costo_puntos - b.costo_puntos),
      );
      this.cancelarEdicion();
    }
  }

  pedirConfirmacion(id: number) {
    this.error.set(null);
    this.idPorBorrar.set(id);
  }

  cancelarBorrado() {
    this.idPorBorrar.set(null);
  }

  async borrar(recompensa: Recompensa) {
    this.borrando.set(true);
    const resultado = await this.recompensasSrv.eliminar(recompensa, this.nombreDe(recompensa));
    this.borrando.set(false);
    this.idPorBorrar.set(null);

    // Con hecho false no se borró (por ejemplo, ya tiene canjes) y solo se
    // muestra el mensaje. Con hecho true y error, falló el log.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.recompensas.update((prev) => prev.filter((r) => r.id !== recompensa.id));
      if (this.idEditando() === recompensa.id) this.cancelarEdicion();
    }
  }
}
