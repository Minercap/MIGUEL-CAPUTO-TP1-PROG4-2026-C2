import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

// Compra de entradas para una función. Por ahora es solo el lugar al que
// llegan los horarios del detalle de la película: el mapa de butacas, el
// candy y el pago se construyen en el bloque de compra.
// No lleva guard: se puede comprar sin cuenta (R-02).
@Component({
  imports: [RouterLink],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra {
  private ruta = inject(ActivatedRoute);

  // El :funcionId de /compra/:funcionId (D-20). No es un signal porque no
  // cambia mientras la pantalla está abierta.
  funcionId = Number(this.ruta.snapshot.paramMap.get('funcionId'));
}
