// Edge Function de Supabase (clase 10): manda las notificaciones push de
// las alertas de Próximamente (R-10, D-52).
//
// Una Edge Function es código que corre en los servidores de Supabase, no
// en el navegador. Está escrita para Deno, que es como Node pero importa
// las librerías desde una dirección en vez de instalarlas con npm. Por
// eso este archivo no forma parte del build de Angular.
//
// Qué hace, cada vez que se la llama:
//   1. Busca las alertas que todavía no se avisaron.
//   2. Se queda con las de películas visibles cuya venta ya abrió.
//   3. A cada usuario le manda el push a todos sus dispositivos.
//   4. Marca la alerta como notificada si al menos un push salió.
//
// La llama Supabase Cron una vez por día (supabase/schema.sql, 15.3).

import { withSupabase } from 'jsr:@supabase/server@^1';
import webpush from 'https://esm.sh/web-push';

// ---------- Las filas que lee de la base ----------

interface Alerta {
  id: number;
  usuario_id: string;
  pelicula_id: number;
  notificada: boolean;
}

interface Pelicula {
  id: number;
  nombre: string;
  fecha_estreno: string; // 'AAAA-MM-DD'
  visible: boolean;
  preventa_habilitada: boolean;
}

interface Suscripcion {
  id: number;
  usuario_id: string;
  endpoint: string;
  auth: string;
  p256dh: string;
}

// Lo que devuelve la función: un resumen de lo que hizo.
interface Resumen {
  // Los primeros cuatro campos son para diagnosticar. Si la función no
  // avisa a nadie, dicen en qué paso se quedó: si no leyó ninguna alerta
  // (candidatas en 0) es un problema de lectura; si las leyó y las
  // descartó, es de la regla, y cada descarte dice por cuál.
  hoy: string; // el día que la función tomó como hoy, en Argentina
  candidatas: number; // alertas sin notificar que leyó, antes de filtrar
  sin_pelicula_visible: number; // descartadas: la película no existe o está oculta
  venta_sin_abrir: number; // descartadas: la venta todavía no abrió
  alertas_revisadas: number; // alertas sin notificar cuya venta ya abrió
  enviadas: number; // alertas avisadas con al menos un push
  sin_suscripcion: number; // el usuario no tiene ningún dispositivo suscripto
  suscripciones_borradas: number; // estaban vencidas
  errores: string[]; // lo que falló, para leerlo en los logs
}

// ---------- La regla de la venta (D-39) ----------
// Es la misma de realizar_compra: la venta abre 7 días antes del estreno
// si la película tiene preventa, o el día del estreno si no. Todo en hora
// argentina.

const DIAS_DE_PREVENTA = 7;
// Argentina está tres horas atrás de UTC todo el año (D-35).
const HORAS_DE_ARGENTINA_A_UTC = 3;
const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;

// Un Date como 'AAAA-MM-DD', leyendo sus partes en UTC.
function aTextoDeDia(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// El día de hoy en Argentina. El servidor está en UTC: se le restan las
// tres horas al instante y se lee en UTC.
function hoyEnArgentina(): string {
  return aTextoDeDia(new Date(Date.now() - HORAS_DE_ARGENTINA_A_UTC * MS_POR_HORA));
}

// El día en que abre la venta de una película, como 'AAAA-MM-DD'.
function inicioDeVenta(pelicula: Pelicula): string {
  if (!pelicula.preventa_habilitada) return pelicula.fecha_estreno;

  const [anio, mes, dia] = pelicula.fecha_estreno.split('-');
  const estreno = Date.UTC(Number(anio), Number(mes) - 1, Number(dia));
  return aTextoDeDia(new Date(estreno - DIAS_DE_PREVENTA * MS_POR_DIA));
}

// ---------- El envío ----------

// Cuando un push falla, web-push lanza un error que trae el código HTTP
// con el que respondió el servicio de notificaciones del navegador. Esta
// función lo lee sin usar any: comprueba que el error sea un objeto y que
// tenga un statusCode numérico. Si no, devuelve null.
function codigoDelError(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return null;
  return typeof error.statusCode === 'number' ? error.statusCode : null;
}

// El mensaje, con la forma que entiende el service worker de Angular
// (angular.dev, Service workers → Push notifications): todo va adentro de
// "notification".
//   icon           el ícono de la PWA.
//   onActionClick  qué pasa al tocar la notificación. "default" es el
//                  toque sobre la notificación misma. La operación
//                  navigateLastFocusedOrOpen lleva la pestaña de la app
//                  que esté abierta a esa URL, o abre una si no hay
//                  ninguna. La URL es relativa al sitio.
// En la clase se mandaba data.url, que el service worker de Angular no
// usa: la notificación llegaba, pero tocarla no abría nada.
function armarMensaje(pelicula: Pelicula): string {
  return JSON.stringify({
    notification: {
      title: 'Ya está a la venta',
      body: `${pelicula.nombre}: ya podés comprar tus entradas.`,
      icon: '/icons/icon-192x192.png',
      data: {
        onActionClick: {
          default: {
            operation: 'navigateLastFocusedOrOpen',
            url: `/pelicula/${pelicula.id}`,
          },
        },
      },
    },
  });
}

// withSupabase arma el contexto (ctx) con los clientes de Supabase ya
// listos, y antes de eso revisa quién llama.
//
// auth: 'secret:cron_alertas' acepta SOLO una clave secret del proyecto: la
// que se llama "cron_alertas", creada para este uso. Llega en el
// encabezado "apikey". Con 'secret' a secas se aceptaría la secret por
// defecto; con el nombre, ninguna otra clave del proyecto sirve para
// disparar los envíos, y si esta se filtra se revoca sin tocar las demás.
// En la clase se aceptaba también la publishable, que es pública:
// cualquiera que la copiara del sitio podía llamar a la función.
// "cron_alertas" la conoce solo la base (está guardada en Vault).
export default {
  fetch: withSupabase({ auth: 'secret:cron_alertas' }, async (_req, ctx) => {
    // Las claves VAPID identifican a este servidor ante el servicio de
    // notificaciones del navegador. Están en los secrets de la función:
    // la privada no está en el repo ni en el front.
    const vapidPublica = Deno.env.get('VAPID_PUBLIC');
    const vapidPrivada = Deno.env.get('VAPID_SECRET');
    const vapidMail = Deno.env.get('VAPID_MAIL');
    if (!vapidPublica || !vapidPrivada || !vapidMail) {
      return Response.json(
        { error: 'Faltan los secrets VAPID_PUBLIC, VAPID_SECRET o VAPID_MAIL.' },
        { status: 500 },
      );
    }
    webpush.setVapidDetails('mailto:' + vapidMail, vapidPublica, vapidPrivada);

    // supabaseAdmin es el cliente que no pasa por RLS: la función tiene
    // que leer las alertas y las suscripciones de todos los usuarios.
    const base = ctx.supabaseAdmin;

    const resumen: Resumen = {
      hoy: hoyEnArgentina(),
      candidatas: 0,
      sin_pelicula_visible: 0,
      venta_sin_abrir: 0,
      alertas_revisadas: 0,
      enviadas: 0,
      sin_suscripcion: 0,
      suscripciones_borradas: 0,
      errores: [],
    };

    // ----- 1. Las alertas pendientes -----
    const { data: dAlertas, error: eAlertas } = await base
      .from('Alertas')
      .select('*')
      .eq('notificada', false);
    if (eAlertas) {
      return Response.json({ error: 'No se pudieron leer las alertas.' }, { status: 500 });
    }
    const alertas: Alerta[] = dAlertas;
    // Lo que se leyó, antes de cualquier filtro.
    resumen.candidatas = alertas.length;

    // ----- 2. Las películas visibles -----
    // Una película oculta no se avisa: no se puede ver ni comprar.
    const { data: dPeliculas, error: ePeliculas } = await base
      .from('Peliculas')
      .select('*')
      .eq('visible', true);
    if (ePeliculas) {
      return Response.json({ error: 'No se pudieron leer las películas.' }, { status: 500 });
    }
    const peliculas: Pelicula[] = dPeliculas;

    const hoy = resumen.hoy;

    for (const alerta of alertas) {
      const pelicula = peliculas.find((p) => p.id === alerta.pelicula_id);
      if (!pelicula) {
        resumen.sin_pelicula_visible++;
        continue;
      }
      // Las fechas 'AAAA-MM-DD' se comparan bien como texto.
      if (hoy < inicioDeVenta(pelicula)) {
        resumen.venta_sin_abrir++;
        continue;
      }
      resumen.alertas_revisadas++;

      // ----- 3. Los dispositivos de ESE usuario -----
      // En la clase el push iba a todas las suscripciones de la tabla.
      const { data: dSuscripciones, error: eSuscripciones } = await base
        .from('SuscripcionesPush')
        .select('*')
        .eq('usuario_id', alerta.usuario_id);
      if (eSuscripciones) {
        resumen.errores.push(`Alerta ${alerta.id}: no se pudieron leer las suscripciones.`);
        continue;
      }
      const suscripciones: Suscripcion[] = dSuscripciones;

      // Sin dispositivos no hay a dónde mandar. La alerta queda sin
      // notificar: el usuario la va a ver como aviso al entrar a la app.
      if (suscripciones.length === 0) {
        resumen.sin_suscripcion++;
        continue;
      }

      const mensaje = armarMensaje(pelicula);
      let enviados = 0;

      for (const suscripcion of suscripciones) {
        try {
          // Se espera cada envío (await) para saber si salió. En la clase
          // se mandaba sin esperar, y un envío fallido no se veía.
          await webpush.sendNotification(
            {
              endpoint: suscripcion.endpoint,
              keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
            },
            mensaje,
          );
          enviados++;
        } catch (error) {
          const codigo = codigoDelError(error);
          // 404 y 410: la suscripción ya no existe (el usuario quitó el
          // permiso o desinstaló la app). No va a volver a andar: se borra.
          if (codigo === 404 || codigo === 410) {
            const { error: eBorrado } = await base
              .from('SuscripcionesPush')
              .delete()
              .eq('id', suscripcion.id);
            if (eBorrado) {
              resumen.errores.push(`Suscripción ${suscripcion.id}: vencida, no se pudo borrar.`);
            } else {
              resumen.suscripciones_borradas++;
            }
          } else {
            resumen.errores.push(
              `Suscripción ${suscripcion.id}: el envío falló (código ${codigo ?? 'desconocido'}).`,
            );
          }
        }
      }

      // ----- 4. Marcar la alerta -----
      // Alcanza con que haya llegado a un dispositivo. Si no salió
      // ninguno, queda pendiente: mañana se intenta de nuevo, y mientras
      // tanto el usuario la ve como aviso en la app.
      if (enviados > 0) {
        const { error: eMarca } = await base
          .from('Alertas')
          .update({ notificada: true })
          .eq('id', alerta.id);
        if (eMarca) {
          resumen.errores.push(`Alerta ${alerta.id}: se envió, pero no se pudo marcar.`);
        } else {
          resumen.enviadas++;
        }
      }
    }

    return Response.json(resumen);
  }),
};
