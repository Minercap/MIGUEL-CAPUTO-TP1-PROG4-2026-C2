import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminCupones } from './admin-cupones';

describe('AdminCupones', () => {
  let component: AdminCupones;
  let fixture: ComponentFixture<AdminCupones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCupones],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCupones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // reset() con los valores iniciales (D-44): sin argumentos, "activo"
  // quedaría en null en lugar de volver a estar marcado.
  it('al cancelar la edición vuelve a los valores iniciales, sin tocar', () => {
    component.editar({ id: 1, nombre: 'Jubilados', porcentaje: 15, condicion: 'mayor_50', activo: false });
    component.formulario.markAllAsTouched();
    component.cancelarEdicion();

    expect(component.formulario.getRawValue()).toEqual({
      nombre: '',
      porcentaje: null,
      condicion: '',
      activo: true,
    });
    expect(component.formulario.touched).toBe(false);
  });
});
