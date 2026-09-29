import { Component, inject } from '@angular/core';
import { Auth } from '../../services/auth';

// Placeholder del perfil del cliente (R-03). Por ahora solo muestra quién
// inició sesión, leyendo el perfil que carga Auth desde la tabla Usuarios.
@Component({
  imports: [],
  selector: 'app-mi-cuenta',
  styleUrl: './mi-cuenta.css',
  templateUrl: './mi-cuenta.html',
})
export class MiCuenta {
  auth = inject(Auth);
}
