import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Productos } from '../../services/productos';
import { Categoria, ComboItem, Producto } from '../../interfaces/producto';
import { largo, obligatorio, textoLibre } from '../../validadores/validadores';

// Candy bar del admin (R-21, R-22, R-34). Arriba, el ABM chico de
// categorías, que se resuelve en esta misma pantalla porque tiene un solo
// campo. Abajo, los productos y combos agrupados por categoría, con Editar
// y Borrar; el alta y la edición van en su propio formulario.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-productos',
  styleUrl: './admin-productos.css',
  templateUrl: './admin-productos.html',
})
export class AdminProductos implements OnInit {
  private fb = inject(FormBuilder);
  private productosSrv = inject(Productos);

  // Estado que lee el template: va en signals (D-03).
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  items = signal<ComboItem[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Categoría nueva: mientras se guarda se bloquea el botón (doble envío).
  creandoCategoria = signal(false);
  // Categoría que se está renombrando en su propia fila. null = ninguna.
  idCategoriaEditando = signal<number | null>(null);
  guardandoCategoria = signal(false);
  // Borrar pide confirmación en la misma fila, como en películas y salas.
  idCategoriaPorBorrar = signal<number | null>(null);
  idProductoPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  // Reglas del nombre de la categoría: docs/validaciones.md, 3.6. Son dos
  // formularios con el mismo campo: el del alta y el de la fila que se
  // está editando, así escribir en uno no cambia el otro.
  formCategoria = this.fb.group({
    nombre: ['', [obligatorio(), largo(2, 40), textoLibre()]],
  });
  formEdicion = this.fb.group({
    nombre: ['', [obligatorio(), largo(2, 40), textoLibre()]],
  });

  // Getters para leer cada campo desde el template (clase 4).
  get nombreNueva() {
    return this.formCategoria.get('nombre');
  }
  get nombreEdicion() {
    return this.formEdicion.get('nombre');
  }

  async ngOnInit() {
    // Tres lecturas independientes. Si falla cualquiera, no se puede armar
    // el listado: se muestra el error y se corta.
    const categorias = await this.productosSrv.traerCategorias();
    const productos = await this.productosSrv.traerTodos();
    const items = await this.productosSrv.traerItemsDeCombos();
    this.cargando.set(false);

    if (categorias.error || !categorias.datos) {
      this.error.set(categorias.error);
      return;
    }
    if (productos.error || !productos.datos) {
      this.error.set(productos.error);
      return;
    }
    if (items.error || !items.datos) {
      this.error.set(items.error);
      return;
    }
    this.categorias.set(categorias.datos);
    this.productos.set(productos.datos);
    this.items.set(items.datos);
  }

  // Los productos de una categoría, para agruparlos en el template. Lee el
  // signal productos(), así que el template se actualiza solo cuando la
  // lista cambia (D-03).
  productosDe(categoriaId: number): Producto[] {
    return this.productos().filter((p) => p.categoria_id === categoriaId);
  }

  // Lo que trae un combo, escrito para mostrarlo: "2 × Pochoclo, 1 × Agua".
  contenidoDe(comboId: number): string {
    return this.items()
      .filter((item) => item.combo_id === comboId)
      .map((item) => `${item.cantidad} × ${this.nombreDe(item.producto_id)}`)
      .join(', ');
  }

  private nombreDe(productoId: number): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? 'Producto desconocido';
  }

  // ---------- Categorías ----------

  async crearCategoria() {
    if (this.formCategoria.invalid || this.creandoCategoria()) return;

    this.error.set(null);
    this.creandoCategoria.set(true);
    // Sin espacios en los extremos, que es como lo miraron los validadores.
    const nombre = (this.formCategoria.getRawValue().nombre ?? '').trim();
    const resultado = await this.productosSrv.crearCategoria({ nombre });
    this.creandoCategoria.set(false);

    // Si se creó pero falló el log, viene la categoría y también el aviso.
    this.error.set(resultado.error);
    const creada = resultado.datos;
    if (creada) {
      // Inmutable, y ordenada como la trae el servicio (clase 3).
      this.categorias.update((prev) =>
        [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      this.formCategoria.reset();
    }
  }

  empezarEdicion(categoria: Categoria) {
    this.error.set(null);
    this.idCategoriaPorBorrar.set(null);
    this.idCategoriaEditando.set(categoria.id);
    // Vuelca el nombre actual en el campo de la fila (D-21).
    this.formEdicion.patchValue({ nombre: categoria.nombre });
  }

  cancelarEdicion() {
    this.idCategoriaEditando.set(null);
  }

  async guardarCategoria(id: number) {
    if (this.formEdicion.invalid || this.guardandoCategoria()) return;

    this.error.set(null);
    this.guardandoCategoria.set(true);
    const nombre = (this.formEdicion.getRawValue().nombre ?? '').trim();
    const resultado = await this.productosSrv.modificarCategoria(id, { nombre });
    this.guardandoCategoria.set(false);

    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.categorias.update((prev) =>
        prev
          .map((c) => (c.id === id ? { id, nombre } : c))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      this.idCategoriaEditando.set(null);
    }
  }

  pedirBorrarCategoria(id: number) {
    this.error.set(null);
    this.idCategoriaEditando.set(null);
    this.idCategoriaPorBorrar.set(id);
  }

  async borrarCategoria(categoria: Categoria) {
    this.borrando.set(true);
    const resultado = await this.productosSrv.eliminarCategoria(categoria);
    this.borrando.set(false);
    this.idCategoriaPorBorrar.set(null);

    // Con hecho false no se borró (por ejemplo, tiene productos) y solo se
    // muestra el mensaje. Con hecho true y error, se borró pero falló el log.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.categorias.update((prev) => prev.filter((c) => c.id !== categoria.id));
    }
  }

  // ---------- Productos ----------

  pedirBorrarProducto(id: number) {
    this.error.set(null);
    this.idProductoPorBorrar.set(id);
  }

  cancelarBorrado() {
    this.idCategoriaPorBorrar.set(null);
    this.idProductoPorBorrar.set(null);
  }

  async borrarProducto(producto: Producto) {
    this.borrando.set(true);
    const resultado = await this.productosSrv.eliminar(producto);
    this.borrando.set(false);
    this.idProductoPorBorrar.set(null);

    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.productos.update((prev) => prev.filter((p) => p.id !== producto.id));
      // Si era un combo, sus ítems se borraron en la base (on delete
      // cascade): se sacan también de la lista.
      this.items.update((prev) => prev.filter((item) => item.combo_id !== producto.id));
    }
  }
}
