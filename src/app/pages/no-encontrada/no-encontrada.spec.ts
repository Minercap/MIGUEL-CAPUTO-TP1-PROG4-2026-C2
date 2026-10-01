import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoEncontrada } from './no-encontrada';

describe('NoEncontrada', () => {
  let component: NoEncontrada;
  let fixture: ComponentFixture<NoEncontrada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoEncontrada],
      // El template usa routerLink, que necesita el router para crearse.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NoEncontrada);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
