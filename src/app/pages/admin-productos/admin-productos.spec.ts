import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminProductos } from './admin-productos';

describe('AdminProductos', () => {
  let component: AdminProductos;
  let fixture: ComponentFixture<AdminProductos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductos],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
