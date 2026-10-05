import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminSalaFormulario } from './admin-sala-formulario';

describe('AdminSalaFormulario', () => {
  let component: AdminSalaFormulario;
  let fixture: ComponentFixture<AdminSalaFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSalaFormulario],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSalaFormulario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
