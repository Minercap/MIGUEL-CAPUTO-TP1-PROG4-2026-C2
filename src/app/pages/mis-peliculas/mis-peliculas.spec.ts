import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MisPeliculas } from './mis-peliculas';

describe('MisPeliculas', () => {
  let component: MisPeliculas;
  let fixture: ComponentFixture<MisPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPeliculas],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MisPeliculas);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
