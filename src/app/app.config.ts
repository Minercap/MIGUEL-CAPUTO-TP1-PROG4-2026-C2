import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Service worker de la PWA (clase 9). Se registra cuando la app queda
    // estable, o a los 30 segundos, lo que pase primero.
    // Solo fuera de desarrollo, como en la clase 10: con ng serve no existe
    // ngsw-worker.js, así que las notificaciones se prueban en el build o
    // en Vercel.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
