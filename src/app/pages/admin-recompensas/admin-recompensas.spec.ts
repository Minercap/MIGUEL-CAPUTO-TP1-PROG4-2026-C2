import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminRecompensas } from './admin-recompensas';

describe('AdminRecompensas', () => {
  let component: AdminRecompensas;
  let fixture: ComponentFixture<AdminRecompensas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRecompensas],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRecompensas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // reset() con los valores iniciales (D-44): sin argumentos, "activa"
  // quedaría en null en lugar de volver a estar marcada.
  it('al cancelar la edición vuelve a los valores iniciales, sin tocar', () => {
    component.editar({ id: 1, tipo: 'entrada', producto_id: null, costo_puntos: 500, activa: false });
    component.formulario.markAllAsTouched();
    component.cancelarEdicion();

    expect(component.formulario.getRawValue()).toEqual({
      tipo: '',
      producto_id: '',
      costo_puntos: null,
      activa: true,
    });
    expect(component.formulario.touched).toBe(false);
  });
});
