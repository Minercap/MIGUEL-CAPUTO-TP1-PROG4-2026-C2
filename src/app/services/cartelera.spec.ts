import { TestBed } from '@angular/core/testing';
import { Cartelera } from './cartelera';

describe('Cartelera', () => {
  let service: Cartelera;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Cartelera);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
