import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cupones } from '../../services/cupones';
import { CondicionCupon, Cupon, CuponPorCrear } from '../../interfaces/cupon';
import { entero, largo, obligatorio, textoLibre, unoDe } from '../../validadores/validadores';

// Cupones del admin (R-23, R-24, D-05): el formulario arriba y la lista
// debajo, en la misma pantalla. "Editar" carga el cupón en el formulario,
// igual que el bloque de categorías del candy.
// Las reglas de cada campo son las de docs/validaciones.md, sección 3.7.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-cupones',
  styleUrl: './admin-cupones.css',
  templateUrl: './admin-cupones.html',
})
export class AdminCupones implements OnInit {
  private fb = inject(FormBuilder);
  cuponesSrv = inject(Cupones);

  // Estado que lee el template: va en signals (D-03).
  cupones = signal<Cupon[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  enviando = signal(false);
  // El cupón que está cargado en el formulario para editarlo. null = alta.
  idEditando = signal<number | null>(null);
  // Borrar pide confirmación en la misma fila, como en el resto del panel.
  idPorBorrar = signal<number | null>(null);
  borrando = signal(false);

  // Los valores del select de condición, para el validador unoDe.
  condiciones: CondicionCupon[] = ['primera_compra', 'mayor_50'];

  // Los valores con los que arranca el formulario. Se usan también en
  // reset() (D-44): sin argumentos, reset() deja todo en null, y "activo"
  // tiene que volver a estar marcado.
  private valoresIniciales = { nombre: '', porcentaje: null, condicion: '', activo: true };

  formulario = this.fb.group({
    nombre: ['', [obligatorio(), largo(3, 40), textoLibre()]],
    porcentaje: [null as number | null, [Validators.required, entero(1, 100)]],
    condicion: ['', [Validators.required, unoDe(this.condiciones)]],
    // Arranca marcado: un cupón nuevo se crea para usarlo.
    activo: [true],
  });

  // Getters para leer cada campo desde el template (clase 4).
  get nombre() {
    return this.formulario.get('nombre');
  }
  get porcentaje() {
    return this.formulario.get('porcentaje');
  }
  get condicion() {
    return this.formulario.get('condicion');
  }

  async ngOnInit() {
    const resultado = await this.cuponesSrv.traerTodos();
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.error.set(resultado.error);
      return;
    }
    this.cupones.set(resultado.datos);
  }

  // Carga el cupón en el formulario de arriba (D-21).
  editar(cupon: Cupon) {
    this.error.set(null);
    this.idPorBorrar.set(null);
    this.idEditando.set(cupon.id);
    this.formulario.patchValue({
      nombre: cupon.nombre,
      porcentaje: cupon.porcentaje,
      condicion: cupon.condicion,
      activo: cupon.activo,
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
    // Sirve para el alta y para la edición: los dos tienen los mismos
    // campos. El nombre va sin espacios en los extremos, como lo miraron
    // los validadores. unoDe ya garantiza que la condición es una de las dos.
    const cupon: CuponPorCrear = {
      nombre: (v.nombre ?? '').trim(),
      porcentaje: Number(v.porcentaje),
      condicion: v.condicion === 'mayor_50' ? 'mayor_50' : 'primera_compra',
      activo: v.activo ?? true,
    };

    const id = this.idEditando();
    if (id === null) {
      const resultado = await this.cuponesSrv.crear(cupon);
      this.enviando.set(false);
      // Si se creó pero falló el log, viene el cupón y también el aviso.
      this.error.set(resultado.error);
      const creado = resultado.datos;
      if (creado) {
        // Inmutable, y ordenado como lo trae el servicio (clase 3).
        this.cupones.update((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        this.formulario.reset(this.valoresIniciales);
      }
      return;
    }

    const resultado = await this.cuponesSrv.modificar(id, cupon);
    this.enviando.set(false);
    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.cupones.update((prev) =>
        prev
          .map((c) => (c.id === id ? { id, ...cupon } : c))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
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

  async borrar(cupon: Cupon) {
    this.borrando.set(true);
    const resultado = await this.cuponesSrv.eliminar(cupon);
    this.borrando.set(false);
    this.idPorBorrar.set(null);

    // Con hecho false no se borró (por ejemplo, ya se usó en compras) y
    // solo se muestra el mensaje. Con hecho true y error, falló el log.
    this.error.set(resultado.error);
    if (resultado.hecho) {
      this.cupones.update((prev) => prev.filter((c) => c.id !== cupon.id));
      // Si era el que estaba cargado en el formulario, se vuelve al alta.
      if (this.idEditando() === cupon.id) this.cancelarEdicion();
    }
  }
}
