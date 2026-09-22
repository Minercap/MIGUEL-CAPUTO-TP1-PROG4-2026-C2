import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoEncontrada } from './no-encontrada';

describe('NoEncontrada', () => {
  let component: NoEncontrada;
  let fixture: ComponentFixture<NoEncontrada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoEncontrada],
    }).compileComponents();

    fixture = TestBed.createComponent(NoEncontrada);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
