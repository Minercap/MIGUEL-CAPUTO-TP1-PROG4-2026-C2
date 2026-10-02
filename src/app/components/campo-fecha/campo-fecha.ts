import { Component, OnChanges, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

// Campo de fecha sin calendario (D-23, R-41): tres desplegables de día, mes
// y año. Es el campo reutilizable de la clase 4, pero en vez de recibir un
// FormControl recibe el FormGroup { dia, mes, anio } que arma la pantalla
// que lo usa.
//
// El componente solo dibuja los desplegables. Las reglas (fecha real, rango)
// son validadores del grupo y viven en validadores/validadores.ts; los
// mensajes de error los pone la pantalla adentro de la etiqueta, y salen
// por <ng-content />.
@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-campo-fecha',
  styleUrl: './campo-fecha.css',
  templateUrl: './campo-fecha.html',
})
export class CampoFecha implements OnChanges {
  grupo = input<FormGroup>();
  etiqueta = input('');

  // El rango de años lo decide quien usa el campo: una fecha de nacimiento
  // va de hoy hasta 120 años atrás; una de estreno, del año pasado al que
  // viene.
  anioDesde = input(1900);
  anioHasta = input(new Date().getFullYear());

  dias = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29, 30, 31,
  ];

  meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Lo lee el template, así que va en un signal (D-03).
  anios = signal<number[]>([]);

  // Se ejecuta cuando llegan o cambian los input (clase 3). Arma la lista
  // de años del más reciente al más viejo: en una fecha de nacimiento o de
  // estreno, los años cercanos son los más usados y quedan arriba.
  ngOnChanges() {
    const lista: number[] = [];
    for (let anio = this.anioHasta(); anio >= this.anioDesde(); anio--) {
      lista.push(anio);
    }
    this.anios.set(lista);
  }
}
