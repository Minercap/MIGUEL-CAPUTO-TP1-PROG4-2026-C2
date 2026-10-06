import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { DetallePelicula } from './detalle-pelicula';

describe('DetallePelicula', () => {
  let component: DetallePelicula;
  let fixture: ComponentFixture<DetallePelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePelicula],
      // El componente lee la ruta activa y su template usa routerLink.
      // El servicio de notificaciones inyecta SwPush, que existe solo si
      // se provee el service worker; en el test va apagado.
      providers: [provideRouter([]), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
