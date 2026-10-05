import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminProductoFormulario } from './admin-producto-formulario';

describe('AdminProductoFormulario', () => {
  let component: AdminProductoFormulario;
  let fixture: ComponentFixture<AdminProductoFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductoFormulario],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductoFormulario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
