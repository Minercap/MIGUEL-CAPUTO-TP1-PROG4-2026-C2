import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Compra } from './compra';

describe('Compra', () => {
  let component: Compra;
  let fixture: ComponentFixture<Compra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Compra],
      // El componente lee la ruta activa y su template usa routerLink.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Compra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
