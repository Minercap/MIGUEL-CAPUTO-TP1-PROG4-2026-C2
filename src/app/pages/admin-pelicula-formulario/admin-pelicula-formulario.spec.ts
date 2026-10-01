import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminPeliculaFormulario } from './admin-pelicula-formulario';

describe('AdminPeliculaFormulario', () => {
  let component: AdminPeliculaFormulario;
  let fixture: ComponentFixture<AdminPeliculaFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPeliculaFormulario],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPeliculaFormulario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
