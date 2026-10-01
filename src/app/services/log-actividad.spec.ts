import { TestBed } from '@angular/core/testing';
import { LogActividad } from './log-actividad';

describe('LogActividad', () => {
  let service: LogActividad;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LogActividad);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
