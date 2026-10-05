import { TestBed } from '@angular/core/testing';
import { Funciones } from './funciones';

describe('Funciones', () => {
  let service: Funciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Funciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
