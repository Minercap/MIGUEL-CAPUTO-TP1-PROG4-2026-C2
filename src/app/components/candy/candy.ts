import { Component, input, output, signal } from '@angular/core';
import { MAXIMO_POR_PRODUCTO } from '../../services/compras';
import { Categoria, ComboItem, Producto } from '../../interfaces/producto';
import { ProductoElegido } from '../../interfaces/compra';
import { PrecioPipe } from '../../pipes/precio-pipe';

// Paso del candy en la compra (R-21, R-22). Arriba, los combos destacados
// (mail 03/03); abajo, los productos sueltos agrupados por categoría. Cada
// uno con su cantidad, de 0 a 10 (validaciones.md 3.10).
//
// Es un componente hijo de la pantalla de compra (clase 3): recibe por
// input() el catálogo y lo que ya está elegido, y avisa por output() cada
// cambio. No llama a la base ni guarda el pedido: eso lo hace la pantalla.
@Component({
  imports: [PrecioPipe],
  selector: 'app-candy',
  styleUrl: './candy.css',
  templateUrl: './candy.html',
})
export class Candy {
  // Lo que manda la pantalla de compra. Los productos llegan ya filtrados:
  // solo los activos.
  productos = input<Producto[]>([]);
  categorias = input<Categoria[]>([]);
  items = input<ComboItem[]>([]); // lo que trae cada combo
  elegidos = input<ProductoElegido[]>([]);
  // Cuántas butacas eligió: cada combo con entrada cubre una (D-46).
  butacas = input(0);

  // Lo que se le avisa a la pantalla de compra.
  cambiar = output<ProductoElegido[]>();
  continuar = output<void>();
  volver = output<void>();

  maximo = MAXIMO_POR_PRODUCTO;

  // Estado que lee el template: va en signals (D-03).
  aviso = signal<string | null>(null);

  // Los combos, que se muestran destacados arriba (R-22).
  combos(): Producto[] {
    return this.productos().filter((p) => p.es_combo);
  }

  // Las categorías que tienen algún producto suelto para ofrecer. Las que
  // no tienen ninguno no se muestran: serían un título vacío.
  categoriasConProductos(): Categoria[] {
    return this.categorias().filter((c) => this.productosDe(c.id).length > 0);
  }

  productosDe(categoriaId: number): Producto[] {
    return this.productos().filter((p) => !p.es_combo && p.categoria_id === categoriaId);
  }

  // Lo que trae un combo, escrito para mostrarlo: "2 × Pochoclo, 1 × Agua".
  contenidoDe(comboId: number): string {
    return this.items()
      .filter((item) => item.combo_id === comboId)
      .map((item) => `${item.cantidad} × ${this.nombreDe(item.producto_id)}`)
      .join(', ');
  }

  cantidadDe(producto: Producto): number {
    return this.elegidos().find((e) => e.producto.id === producto.id)?.cantidad ?? 0;
  }

  // Suma una unidad. Dos topes: 10 por producto, y no más combos con
  // entrada que butacas elegidas, porque cada uno cubre una (D-46).
  sumar(producto: Producto) {
    this.aviso.set(null);
    const actual = this.cantidadDe(producto);
    if (actual >= MAXIMO_POR_PRODUCTO) {
      this.aviso.set(`Podés llevar hasta ${MAXIMO_POR_PRODUCTO} unidades de cada producto.`);
      return;
    }
    if (producto.incluye_entrada && this.combosConEntrada() >= this.butacas()) {
      this.aviso.set(
        `Cada combo con entrada cubre una butaca: elegiste ${this.butacas()} butacas, así que podés llevar hasta ${this.butacas()} combos con entrada.`,
      );
      return;
    }
    this.fijar(producto, actual + 1);
  }

  restar(producto: Producto) {
    this.aviso.set(null);
    const actual = this.cantidadDe(producto);
    if (actual > 0) this.fijar(producto, actual - 1);
  }

  // Lo que suma lo elegido, para el pie del paso. Es una vista previa: el
  // precio lo pone la base al pagar (D-39).
  subtotal(): number {
    let total = 0;
    for (const e of this.elegidos()) total += e.producto.precio * e.cantidad;
    return total;
  }

  // Cuántas butacas cubren los combos elegidos.
  combosConEntrada(): number {
    let total = 0;
    for (const e of this.elegidos()) {
      if (e.producto.incluye_entrada) total += e.cantidad;
    }
    return total;
  }

  // Arma la lista nueva y se la avisa a la pantalla (inmutable, clase 3):
  // con 0 el producto sale de la lista; si ya estaba, cambia su cantidad;
  // si no, se agrega al final.
  private fijar(producto: Producto, cantidad: number) {
    const sinEste = this.elegidos().filter((e) => e.producto.id !== producto.id);
    if (cantidad === 0) {
      this.cambiar.emit(sinEste);
      return;
    }
    const yaEstaba = this.elegidos().some((e) => e.producto.id === producto.id);
    this.cambiar.emit(
      yaEstaba
        ? this.elegidos().map((e) => (e.producto.id === producto.id ? { producto, cantidad } : e))
        : [...this.elegidos(), { producto, cantidad }],
    );
  }

  private nombreDe(productoId: number): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? 'Producto';
  }
}
