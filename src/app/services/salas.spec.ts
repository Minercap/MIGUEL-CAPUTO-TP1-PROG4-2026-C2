import { TestBed } from '@angular/core/testing';
import { Salas } from './salas';

describe('Salas', () => {
  let service: Salas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Salas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
