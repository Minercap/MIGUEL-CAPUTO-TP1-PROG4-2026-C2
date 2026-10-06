import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmpleadoValidacion } from './empleado-validacion';

describe('EmpleadoValidacion', () => {
  let component: EmpleadoValidacion;
  let fixture: ComponentFixture<EmpleadoValidacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadoValidacion],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpleadoValidacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
