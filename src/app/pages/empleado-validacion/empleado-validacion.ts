import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Escaner } from '../../services/escaner';
import { Validacion } from '../../services/validacion';
import { ResultadoValidacion, TipoValidacion } from '../../interfaces/validacion';
import { codigoCompra, obligatorio } from '../../validadores/validadores';

// El id del elemento donde la librería del lector pone el video. Es el
// mismo que tiene el <div> del template.
const ID_LECTOR = 'lector-qr';

// La pantalla del empleado (R-31 a R-33, D-50, D-51): valida la entrada en
// el ingreso a la sala o entrega el candy en el mostrador. El código llega
// de dos formas, y las dos terminan en el mismo método validar():
//   - con la cámara, leyendo el QR de la entrada (R-31);
//   - escrito a mano, si el lector no funciona (R-32).
// Las reglas del código son las de docs/validaciones.md, sección 3.12.
@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-empleado-validacion',
  styleUrl: './empleado-validacion.css',
  templateUrl: './empleado-validacion.html',
})
export class EmpleadoValidacion implements OnDestroy {
  private fb = inject(FormBuilder);
  private escaner = inject(Escaner);
  private validacion = inject(Validacion);

  idLector = ID_LECTOR;

  // Estado que lee el template: va en signals (D-03). Importa más que en
  // otras pantallas, porque el código leído llega desde un callback de la
  // librería de la cámara: con un campo común, la pantalla no se movería.
  tipo = signal<TipoValidacion>('entrada');
  camaraActiva = signal(false);
  abriendoCamara = signal(false);
  // Después de leer un código la cámara queda en pausa hasta "Escanear otro".
  camaraEnPausa = signal(false);
  errorCamara = signal<string | null>(null);
  enviando = signal(false);
  // El resultado de la última validación. null = todavía no se validó nada.
  resultado = signal<ResultadoValidacion | null>(null);

  formulario = this.fb.group({
    codigo: ['', [obligatorio(), codigoCompra()]],
  });

  // Getter para leer el campo desde el template (clase 4).
  get codigo() {
    return this.formulario.get('codigo');
  }

  // Cambia qué se valida. El resultado anterior se borra, porque era de la
  // otra pestaña, y si la cámara estaba en pausa vuelve a leer: así se
  // puede validar el candy con el mismo QR que recién validó la entrada.
  elegirTipo(tipo: TipoValidacion) {
    if (this.enviando()) return;
    this.tipo.set(tipo);
    this.resultado.set(null);
    this.reanudarCamara();
  }

  async activarCamara() {
    if (this.abriendoCamara() || this.camaraActiva()) return;
    this.errorCamara.set(null);
    this.abriendoCamara.set(true);

    // El servicio llama a alLeer() cada vez que la cámara lee un código.
    const error = await this.escaner.iniciar(ID_LECTOR, (texto) => this.alLeer(texto));

    this.abriendoCamara.set(false);
    if (error) {
      this.errorCamara.set(error);
      return;
    }
    this.camaraActiva.set(true);
    this.camaraEnPausa.set(false);
  }

  async detenerCamara() {
    await this.escaner.detener();
    this.camaraActiva.set(false);
    this.camaraEnPausa.set(false);
  }

  // Lo que pasa cuando la cámara lee un código. Primero se pausa: la
  // cámara lee varias veces por segundo, y sin la pausa el mismo QR se
  // mandaría a validar dos veces y la segunda diría "ya se validó".
  private alLeer(texto: string) {
    if (this.enviando() || this.camaraEnPausa()) return;
    this.escaner.pausar();
    this.camaraEnPausa.set(true);
    this.validar(texto);
  }

  // "Escanear otro": borra el resultado y la cámara vuelve a leer.
  escanearOtro() {
    this.resultado.set(null);
    this.reanudarCamara();
  }

  private reanudarCamara() {
    if (!this.camaraActiva() || !this.camaraEnPausa()) return;
    this.escaner.reanudar();
    this.camaraEnPausa.set(false);
  }

  // La carga manual (R-32).
  async validarManual() {
    // enviando() evita el doble envío si se aprieta Enter dos veces.
    if (this.formulario.invalid || this.enviando()) return;

    const hecho = await this.validar(this.codigo?.value ?? '');
    // Si se validó, el campo queda vacío y sin tocar, listo para el
    // siguiente. Si no, el código queda escrito para poder corregirlo.
    if (hecho) this.formulario.reset({ codigo: '' });
  }

  // Valida el código, venga de la cámara o del formulario. El servicio lo
  // normaliza (mayúsculas y sin espacios) antes de mandarlo. Devuelve si
  // la compra quedó validada.
  private async validar(codigo: string): Promise<boolean> {
    this.resultado.set(null);
    this.enviando.set(true);

    const resultado = await this.validacion.validar(codigo, this.tipo());

    this.enviando.set(false);
    this.resultado.set(resultado);
    return resultado.hecho;
  }

  // Al salir de la pantalla se apaga la cámara (clase 2): si no, seguiría
  // prendida con la página ya cerrada.
  ngOnDestroy() {
    this.escaner.detener();
  }
}
