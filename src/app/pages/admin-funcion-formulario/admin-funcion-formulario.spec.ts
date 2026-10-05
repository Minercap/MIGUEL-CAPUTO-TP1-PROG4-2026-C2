import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminFuncionFormulario } from './admin-funcion-formulario';

describe('AdminFuncionFormulario', () => {
  let component: AdminFuncionFormulario;
  let fixture: ComponentFixture<AdminFuncionFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFuncionFormulario],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFuncionFormulario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
