import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Productos } from '../../services/productos';
import {
  Categoria,
  ComboItemPorCrear,
  Producto,
  ProductoPorCrear,
} from '../../interfaces/producto';
import { entero, largo, obligatorio, precio, textoLibre } from '../../validadores/validadores';

// Un renglón del combo: qué producto y cuántos. El producto es texto
// porque es lo que maneja el <select>; se convierte a número al guardar.
type ItemForm = FormGroup<{
  producto_id: FormControl<string | null>;
  cantidad: FormControl<number | null>;
}>;

// Alta y edición de productos y combos del candy bar (R-21, R-22) en un
// solo formulario reactivo (clase 4). La misma pantalla atiende
// /admin/productos/nuevo y /admin/productos/:id: lo que cambia es si la URL
// trae un id o no. Un combo es un producto con "es combo" tildado y la
// lista de lo que trae (D-40).
// Las reglas de cada campo son las de docs/validaciones.md, sección 3.6.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-producto-formulario',
  styleUrl: './admin-producto-formulario.css',
  templateUrl: './admin-producto-formulario.html',
})
export class AdminProductoFormulario implements OnInit {
  private fb = inject(FormBuilder);
  private productosSrv = inject(Productos);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);

  // El :id de la URL (D-20). En /nuevo no hay parámetro y queda null.
  // No es un signal porque no cambia mientras la pantalla está abierta.
  private idDeLaUrl = this.ruta.snapshot.paramMap.get('id');
  id = this.idDeLaUrl === null ? null : Number(this.idDeLaUrl);

  // Estado que lee el template: va en signals (D-03).
  categorias = signal<Categoria[]>([]);
  // Lo que se puede poner adentro de un combo: los productos que no son
  // combo (no hay combos dentro de combos, D-40) y están activos. En la
  // edición se suman los inactivos que el combo ya traía, para que se vean
  // elegidos.
  opcionesCombo = signal<Producto[]>([]);
  // En la edición: si este producto está adentro de algún combo. Si lo
  // está, no se puede convertir en combo.
  estaEnCombos = signal(false);
  cargando = signal(true);
  errorCarga = signal<string | null>(null); // no se pudo armar el formulario
  error = signal<string | null>(null); // no se pudo guardar
  aviso = signal<string | null>(null); // se guardó, pero falló un paso posterior
  enviando = signal(false);
  // Un alta que salió bien a medias no se puede reenviar: crearía otro.
  bloqueado = signal(false);

  formulario = this.fb.group(
    {
      nombre: ['', [obligatorio(), largo(2, 60), textoLibre()]],
      categoria_id: ['', [Validators.required, this.categoriaExistente()]],
      precio: [null as number | null, [Validators.required, precio()]],
      es_combo: [false],
      incluye_entrada: [false],
      // Arranca marcado: un producto nuevo se crea para venderlo.
      activo: [true],
      // Los renglones del combo (FormArray, clase 4). Arranca vacío: se
      // agregan con push al tildar "es combo" o con el botón.
      items: this.fb.array<ItemForm>([], [this.sinRepetidos()]),
    },
    // Mira dos campos (es_combo e items), así que va en el grupo (D-17).
    { validators: [this.comboConProductos()] },
  );

  // Un renglón nuevo del combo. La cantidad es entero(1, 10) (3.6).
  nuevoItem(productoId: string | null = '', cantidad: number | null = 1): ItemForm {
    return this.fb.group({
      producto_id: this.fb.control(productoId, [Validators.required, this.productoParaCombo()]),
      cantidad: this.fb.control(cantidad, [Validators.required, entero(1, 10)]),
    });
  }

  // La categoría tiene que ser una de las existentes (validaciones.md,
  // principio 4): el <select> se puede cambiar desde la consola. Es un
  // método del componente porque necesita leer categorias().
  categoriaExistente(): ValidatorFn {
    return (control: AbstractControl) => {
      const elegida = String(control.value ?? '');
      if (elegida === '') return null;
      return this.categorias().some((c) => String(c.id) === elegida)
        ? null
        : { categoriaInexistente: true };
    };
  }

  // Mismo criterio para el producto de cada renglón: tiene que ser uno de
  // los ofrecidos, o sea, uno que no es combo (D-40).
  productoParaCombo(): ValidatorFn {
    return (control: AbstractControl) => {
      const elegido = String(control.value ?? '');
      if (elegido === '') return null;
      return this.opcionesCombo().some((p) => String(p.id) === elegido)
        ? null
        : { productoNoOfrecido: true };
    };
  }

  // Sobre el FormArray: el mismo producto no puede estar en dos renglones;
  // para eso está la cantidad. La base lo rechazaría igual, por la clave
  // primaria (combo_id, producto_id).
  sinRepetidos(): ValidatorFn {
    return (control: AbstractControl) => {
      const renglones: { producto_id: string | null }[] = control.value;
      const elegidos = renglones.map((r) => r.producto_id).filter((id) => id);
      return new Set(elegidos).size < elegidos.length ? { productoRepetido: true } : null;
    };
  }

  // Sobre el grupo: un combo trae al menos un producto (3.6).
  comboConProductos(): ValidatorFn {
    return (grupo: AbstractControl) => {
      const esCombo: boolean = grupo.get('es_combo')?.value;
      const renglones: unknown[] = grupo.get('items')?.value ?? [];
      return esCombo && renglones.length === 0 ? { comboVacio: true } : null;
    };
  }

  // Getters para leer cada campo desde el template (clase 4).
  get nombre() {
    return this.formulario.get('nombre');
  }
  get categoriaId() {
    return this.formulario.get('categoria_id');
  }
  get precioProducto() {
    return this.formulario.get('precio');
  }
  get esCombo(): boolean {
    return this.formulario.controls.es_combo.value ?? false;
  }
  get itemsForm() {
    return this.formulario.controls.items;
  }

  async ngOnInit() {
    const categorias = await this.productosSrv.traerCategorias();
    if (categorias.error || !categorias.datos) {
      this.errorCarga.set(categorias.error);
      this.cargando.set(false);
      return;
    }
    if (categorias.datos.length === 0) {
      this.errorCarga.set('Todavía no hay categorías. Creá una antes de cargar productos.');
      this.cargando.set(false);
      return;
    }
    this.categorias.set(categorias.datos);

    const productos = await this.productosSrv.traerTodos();
    if (productos.error || !productos.datos) {
      this.errorCarga.set(productos.error);
      this.cargando.set(false);
      return;
    }
    const todos = productos.datos;

    if (this.id === null) {
      this.opcionesCombo.set(todos.filter((p) => !p.es_combo && p.activo));
      this.cargando.set(false);
      return;
    }

    const resultado = await this.productosSrv.traerUno(this.id);
    if (resultado.error || !resultado.datos) {
      this.errorCarga.set(resultado.error);
      this.cargando.set(false);
      return;
    }
    const producto = resultado.datos;
    const yaElegidos = producto.items.map((item) => item.producto_id);

    // Se anota antes de cargar el formulario: los validadores de los
    // renglones leen opcionesCombo, y patchValue vuelve a validar.
    this.opcionesCombo.set(
      todos.filter(
        (p) =>
          !p.es_combo && p.id !== producto.id && (p.activo || yaElegidos.includes(p.id)),
      ),
    );
    this.estaEnCombos.set(producto.esta_en_combos);

    // Un renglón por cada ítem guardado, con push (clase 4).
    for (const item of producto.items) {
      this.itemsForm.push(this.nuevoItem(String(item.producto_id), item.cantidad));
    }

    // Vuelca el producto en el formulario ya creado (D-21).
    this.formulario.patchValue({
      nombre: producto.nombre,
      categoria_id: String(producto.categoria_id),
      precio: producto.precio,
      es_combo: producto.es_combo,
      incluye_entrada: producto.incluye_entrada,
      activo: producto.activo,
    });
    this.cargando.set(false);
  }

  // Al tildar "es combo" aparece el primer renglón para no arrancar con la
  // lista vacía. Al destildarlo se vacía la lista y se apaga "incluye
  // entrada", que solo vale para un combo (check de la base, D-40).
  alCambiarCombo() {
    if (this.esCombo) {
      if (this.itemsForm.length === 0) this.agregarItem();
      return;
    }
    while (this.itemsForm.length > 0) this.itemsForm.removeAt(0);
    this.formulario.patchValue({ incluye_entrada: false });
  }

  agregarItem() {
    this.itemsForm.push(this.nuevoItem());
  }

  quitarItem(indice: number) {
    this.itemsForm.removeAt(indice);
  }

  async guardar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.bloqueado() || this.enviando()) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();
    const esCombo = v.es_combo ?? false;

    // Sirve para el alta y para la edición: ProductoPorCrear y
    // ProductoPorModificar tienen los mismos campos. El nombre va sin
    // espacios en los extremos, que es como lo miraron los validadores.
    const producto: ProductoPorCrear = {
      categoria_id: Number(v.categoria_id),
      nombre: (v.nombre ?? '').trim(),
      precio: Number(v.precio),
      es_combo: esCombo,
      incluye_entrada: esCombo && (v.incluye_entrada ?? false),
      activo: v.activo ?? true,
    };

    // Del texto del <select> a números. Si no es combo no va ninguno.
    const items: ComboItemPorCrear[] = esCombo
      ? v.items.map((item) => ({
          producto_id: Number(item.producto_id),
          cantidad: Number(item.cantidad),
        }))
      : [];

    const resultado =
      this.id === null
        ? await this.productosSrv.crear(producto, items)
        : await this.productosSrv.modificar(this.id, producto, items);

    this.enviando.set(false);

    if (!resultado.hecho) {
      this.error.set(resultado.error);
      return;
    }
    if (resultado.error) {
      // Se guardó, pero falló un paso posterior: se avisa y se queda en la
      // pantalla. Si era un alta, se bloquea el reenvío.
      this.aviso.set(resultado.error);
      this.bloqueado.set(this.id === null);
      return;
    }
    this.router.navigateByUrl('/admin/productos');
  }
}
