import { TestBed } from '@angular/core/testing';
import { Recompensas } from './recompensas';

describe('Recompensas', () => {
  let service: Recompensas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recompensas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
