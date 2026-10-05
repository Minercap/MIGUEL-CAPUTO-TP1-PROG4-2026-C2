import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminSalas } from './admin-salas';

describe('AdminSalas', () => {
  let component: AdminSalas;
  let fixture: ComponentFixture<AdminSalas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSalas],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSalas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
