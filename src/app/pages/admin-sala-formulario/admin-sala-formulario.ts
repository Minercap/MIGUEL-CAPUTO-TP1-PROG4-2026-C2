import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Salas } from '../../services/salas';
import { SalaPorCrear } from '../../interfaces/sala';
import { largo, obligatorio, textoLibre } from '../../validadores/validadores';

// Alta y edición de salas (R-34) en un solo formulario reactivo (clase 4).
// La misma pantalla atiende /admin/salas/nueva y /admin/salas/:id: lo que
// cambia es si la URL trae un id o no.
// Las reglas del nombre son las de docs/validaciones.md, sección 3.4.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-sala-formulario',
  styleUrl: './admin-sala-formulario.css',
  templateUrl: './admin-sala-formulario.html',
})
export class AdminSalaFormulario implements OnInit {
  private fb = inject(FormBuilder);
  private salasSrv = inject(Salas);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);

  // El :id de la URL (D-20). En /nueva no hay parámetro y queda null.
  // No es un signal porque no cambia mientras la pantalla está abierta.
  private idDeLaUrl = this.ruta.snapshot.paramMap.get('id');
  id = this.idDeLaUrl === null ? null : Number(this.idDeLaUrl);

  // Estado que lee el template: va en signals (D-03).
  // En el alta no hay nada que traer, así que no arranca cargando.
  cargando = signal(this.id !== null);
  errorCarga = signal<string | null>(null); // no se pudo armar el formulario
  error = signal<string | null>(null); // no se pudo guardar
  aviso = signal<string | null>(null); // se guardó, pero falló el log
  enviando = signal(false);
  // Un alta que salió bien a medias no se puede reenviar: crearía otra sala.
  bloqueado = signal(false);

  formulario = this.fb.group({
    nombre: ['', [obligatorio(), largo(2, 30), textoLibre()]],
    // Arranca marcada: una sala nueva se crea para usarla.
    activa: [true],
  });

  // Getter para leer el campo desde el template (clase 4).
  get nombre() {
    return this.formulario.get('nombre');
  }

  async ngOnInit() {
    if (this.id === null) return;

    const resultado = await this.salasSrv.traerUna(this.id);
    this.cargando.set(false);
    if (resultado.error || !resultado.datos) {
      this.errorCarga.set(resultado.error);
      return;
    }

    // Vuelca la sala en el formulario ya creado (D-21).
    this.formulario.patchValue({
      nombre: resultado.datos.nombre,
      activa: resultado.datos.activa,
    });
  }

  async guardar() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.bloqueado() || this.enviando()) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    const v = this.formulario.getRawValue();

    // Sirve para el alta y para la edición: SalaPorCrear y SalaPorModificar
    // tienen los mismos campos. El nombre va sin espacios en los extremos,
    // que es como lo miraron los validadores.
    const sala: SalaPorCrear = {
      nombre: (v.nombre ?? '').trim(),
      activa: v.activa ?? true,
    };

    const resultado =
      this.id === null
        ? await this.salasSrv.crear(sala)
        : await this.salasSrv.modificar(this.id, sala);

    this.enviando.set(false);

    if (!resultado.hecho) {
      this.error.set(resultado.error);
      return;
    }
    if (resultado.error) {
      // Se guardó, pero falló el log (D-14): se avisa y se queda en la
      // pantalla. Si era un alta, se bloquea el reenvío.
      this.aviso.set(resultado.error);
      this.bloqueado.set(this.id === null);
      return;
    }
    this.router.navigateByUrl('/admin/salas');
  }
}
