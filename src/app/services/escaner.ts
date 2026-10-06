import { Service } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';

// El lector de QR con la cámara (R-31, D-50). Es el único archivo de la
// app que usa la librería html5-qrcode: si se cambia por otra, se cambia
// acá y nada más, igual que Tickets con qrcode y jsPDF.
//
// Se usa la clase Html5Qrcode, que es la parte de la librería que solo lee:
// abre la cámara, muestra el video dentro de un elemento de la página y
// avisa cada vez que encuentra un código. Los botones y los mensajes los
// pone la pantalla, con el estilo de la app.
//
// La cámara solo se puede abrir en una página con HTTPS (o en localhost):
// es una regla del navegador. En Vercel ya se cumple.
@Service()
export class Escaner {
  // El lector abierto, si hay uno. Lo guarda el servicio para poder
  // pausarlo y cerrarlo después; la pantalla no toca la librería.
  private lector: Html5Qrcode | null = null;
  private pausado = false;

  // Abre la cámara y muestra el video dentro del elemento con ese id.
  // Cada vez que lee un código llama a alLeer con el texto que tenía.
  // Devuelve null si la cámara quedó abierta, o el mensaje de error.
  async iniciar(idElemento: string, alLeer: (texto: string) => void): Promise<string | null> {
    // Si había una cámara abierta, se cierra antes de abrir otra.
    await this.detener();

    try {
      const lector = new Html5Qrcode(idElemento);
      // start() recibe cuatro cosas:
      //   1. Qué cámara usar. facingMode 'environment' es la trasera del
      //      celular, la que apunta al código; en una computadora, que
      //      tiene una sola, usa esa.
      //   2. fps: cuántas veces por segundo busca un código en la imagen.
      //   3. La función que se llama cuando encuentra uno.
      //   4. La que se llama cuando en una imagen no encuentra nada. Pasa
      //      varias veces por segundo mientras no haya un QR adelante: no
      //      es un error, así que no se usa.
      // La promesa se cumple cuando el usuario dio el permiso y el video
      // ya se está viendo.
      await lector.start(
        { facingMode: 'environment' },
        { fps: 10 },
        (texto) => alLeer(texto),
        undefined,
      );
      this.lector = lector;
      this.pausado = false;
      return null;
    } catch {
      // Llega acá si el usuario no dio el permiso, si el dispositivo no
      // tiene cámara o si la página no está en HTTPS.
      return 'No se pudo abrir la cámara. Revisá el permiso del navegador o cargá el código a mano.';
    }
  }

  // Deja de leer, con la imagen congelada (el true), sin cerrar la cámara.
  // Sirve para no leer dos veces el mismo código mientras se valida.
  pausar() {
    if (this.lector && !this.pausado) {
      this.lector.pause(true);
      this.pausado = true;
    }
  }

  // Vuelve a leer después de una pausa.
  reanudar() {
    if (this.lector && this.pausado) {
      this.lector.resume();
      this.pausado = false;
    }
  }

  // Cierra la cámara. La pantalla lo llama en ngOnDestroy: si no, la
  // cámara seguiría prendida después de salir de la página.
  async detener() {
    const lector = this.lector;
    if (!lector) return;
    this.lector = null;
    this.pausado = false;

    try {
      // stop() apaga la cámara y clear() saca el video del elemento.
      await lector.stop();
      lector.clear();
    } catch {
      // Si la cámara ya estaba apagada, stop() falla. No hay nada que
      // avisar: el resultado es el mismo, la cámara queda cerrada.
    }
  }
}
