import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminFunciones } from './admin-funciones';

describe('AdminFunciones', () => {
  let component: AdminFunciones;
  let fixture: ComponentFixture<AdminFunciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFunciones],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFunciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
