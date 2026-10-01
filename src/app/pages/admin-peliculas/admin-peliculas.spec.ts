import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminPeliculas } from './admin-peliculas';

describe('AdminPeliculas', () => {
  let component: AdminPeliculas;
  let fixture: ComponentFixture<AdminPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPeliculas],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPeliculas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
