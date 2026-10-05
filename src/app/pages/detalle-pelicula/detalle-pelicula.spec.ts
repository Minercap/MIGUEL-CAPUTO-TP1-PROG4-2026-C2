import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DetallePelicula } from './detalle-pelicula';

describe('DetallePelicula', () => {
  let component: DetallePelicula;
  let fixture: ComponentFixture<DetallePelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePelicula],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
