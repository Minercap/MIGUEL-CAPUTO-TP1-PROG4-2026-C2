import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPeliculas } from './admin-peliculas';

describe('AdminPeliculas', () => {
  let component: AdminPeliculas;
  let fixture: ComponentFixture<AdminPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPeliculas],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPeliculas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
