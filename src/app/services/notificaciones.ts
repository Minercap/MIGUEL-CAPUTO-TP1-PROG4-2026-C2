import { Service, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from './supabase';
import { Auth } from './auth';
import { SuscripcionPush, SuscripcionPushPorCrear } from '../interfaces/alerta';
import { environment } from '../../environments/environment';

// Cuánto se espera, como mucho, a que el navegador responda.
const ESPERA_CONSULTA_MS = 3000;
const ESPERA_SUSCRIPCION_MS = 30000;

// Las notificaciones push de este dispositivo (clase 10, D-52). El
// circuito completo es: permiso -> suscripción guardada en la base ->
// Edge Function programada -> notificación al celular. Este servicio hace
// los dos primeros pasos.
//
// SwPush es el servicio de Angular que habla con el service worker. Solo
// funciona si el service worker está activo, y eso pasa en el build
// publicado (Vercel), no con ng serve.
@Service()
export class Notificaciones {
  private swPush = inject(SwPush);
  private sup = inject(SupabaseService);
  private auth = inject(Auth);

  // Dice si este dispositivo ya tiene una suscripción a las
  // notificaciones.
  //
  // SwPush.subscription es un observable (clase 3) que entrega la
  // suscripción actual, o null si no hay. Se lee con subscribe() y se
  // pasa a una promesa, para poder usar await como en el resto de la app.
  // Si el service worker todavía no tomó el control de la página, el
  // observable no entrega nada: por eso hay un límite de tiempo, pasado el
  // cual se responde que no hay suscripción.
  tieneSuscripcion(): Promise<boolean> {
    if (!this.swPush.isEnabled) return Promise.resolve(false);

    return new Promise((resolver) => {
      const limite = setTimeout(() => {
        escucha.unsubscribe();
        resolver(false);
      }, ESPERA_CONSULTA_MS);

      const escucha = this.swPush.subscription.subscribe((suscripcion) => {
        clearTimeout(limite);
        // Con el primer valor alcanza: se deja de escuchar (clase 3). El
        // setTimeout de 0 lo deja para después de que subscribe() termine
        // de devolver "escucha", por si el valor llega en el momento.
        setTimeout(() => escucha.unsubscribe(), 0);
        resolver(suscripcion !== null);
      });
    });
  }

  // Suscribe este dispositivo y guarda la suscripción en la base, a nombre
  // del usuario con sesión. Devuelve null si salió bien, o el mensaje de
  // error para que la pantalla lo muestre.
  //
  // Si el dispositivo ya estaba suscripto, requestSubscription no vuelve a
  // preguntar: devuelve la suscripción que ya existe, y acá se comprueba
  // que esté guardada.
  async suscribir(): Promise<string | null> {
    // Sin service worker no hay push (clase 10).
    if (!this.swPush.isEnabled) {
      return 'Las notificaciones funcionan con la app instalada o desde el sitio publicado.';
    }
    if (environment.PUBLIC_VAPID === '') {
      return 'Las notificaciones todavía no están configuradas en esta versión de la app.';
    }
    const usuario = this.auth.usuarioActual();
    if (!usuario) return 'Iniciá sesión para activar las notificaciones.';

    // Notification.permission es lo que el navegador tiene guardado para
    // este sitio: 'default' (todavía no se preguntó), 'granted' o 'denied'.
    // Con 'denied' el navegador ya no muestra el cartel: rechaza el pedido
    // sin preguntar. Solo el usuario lo puede cambiar, desde el candado.
    if ('Notification' in window && Notification.permission === 'denied') {
      return 'Las notificaciones están bloqueadas en este navegador. Habilitalas desde el candado, a la izquierda de la dirección, y volvé a intentar.';
    }

    let suscripcion: PushSubscription;
    try {
      // requestSubscription le pide permiso al usuario (el cartel del
      // navegador) y devuelve la suscripción. serverPublicKey es la clave
      // VAPID pública: dice qué servidor va a poder mandarle mensajes.
      // conLimite corta la espera si el navegador no responde.
      suscripcion = await this.conLimite(
        this.swPush.requestSubscription({ serverPublicKey: environment.PUBLIC_VAPID }),
        ESPERA_SUSCRIPCION_MS,
      );
    } catch (error) {
      // NotAllowedError es el error del navegador cuando el usuario toca
      // "Bloquear", o cuando ya las tenía bloqueadas para este sitio.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return 'No diste permiso para las notificaciones. Vas a ver el aviso dentro de la app.';
      }
      return 'No se pudieron activar las notificaciones. Recargá la página y probá de nuevo.';
    }

    // toJSON() pasa la suscripción a un objeto común con sus tres datos:
    // el endpoint y las dos claves (clase 10).
    const json = suscripcion.toJSON();
    const endpoint = json.endpoint;
    const auth = json.keys?.['auth'];
    const p256dh = json.keys?.['p256dh'];
    if (!endpoint || !auth || !p256dh) {
      return 'El navegador devolvió una suscripción incompleta. Probá de nuevo.';
    }

    // ¿Ya está guardada? RLS deja ver solo las propias, así que si
    // aparece es de este usuario y no hay que duplicarla.
    const { data, error: errorLectura } = await this.sup.Sup.from('SuscripcionesPush')
      .select('*')
      .eq('endpoint', endpoint);
    if (errorLectura) return 'No se pudo guardar la suscripción a las notificaciones.';
    const guardadas: SuscripcionPush[] = data;
    if (guardadas.length > 0) return null;

    const fila: SuscripcionPushPorCrear = { usuario_id: usuario.id, endpoint, auth, p256dh };
    const { error } = await this.sup.Sup.from('SuscripcionesPush').insert(fila);
    if (error) {
      // 23505 es "violación de unique": el endpoint ya está en la tabla,
      // pero no entre las de este usuario. Es el mismo dispositivo, usado
      // antes con otra cuenta.
      return error.code === '23505'
        ? 'Este dispositivo ya recibe notificaciones de otra cuenta. Vas a ver el aviso dentro de la app.'
        : 'No se pudo guardar la suscripción a las notificaciones.';
    }
    return null;
  }

  // Espera una promesa, pero no más que el límite: si se pasa, falla.
  // Promise.race recibe varias promesas y se queda con la primera que
  // termina. Hace falta porque requestSubscription espera al service
  // worker, y si todavía no tomó el control de la página no responde
  // nunca: sin límite, el botón quedaría en "Activando…" para siempre.
  private conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
    const limite = new Promise<T>((_resolver, rechazar) => {
      setTimeout(() => rechazar(new Error('tiempo agotado')), ms);
    });
    return Promise.race([promesa, limite]);
  }
}
