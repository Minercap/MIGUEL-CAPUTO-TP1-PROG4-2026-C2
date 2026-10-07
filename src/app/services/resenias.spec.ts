import { TestBed } from '@angular/core/testing';
import { Resenias } from './resenias';
import { Resenia } from '../interfaces/resenia';

// Una reseña de prueba: solo importan la película y las estrellas.
function resenia(peliculaId: number, estrellas: number): Resenia {
  return {
    id: 0,
    usuario_id: 'u',
    pelicula_id: peliculaId,
    estrellas,
    comentario: null,
    creado_en: '',
  };
}

describe('Resenias', () => {
  let service: Resenias;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Resenias);
  });

  it('promedia las estrellas de cada película por separado', () => {
    const promedios = service.promediar([resenia(1, 5), resenia(2, 2), resenia(1, 4)]);
    expect(promedios).toEqual([
      { pelicula_id: 1, promedio: 4.5, cantidad: 2 },
      { pelicula_id: 2, promedio: 2, cantidad: 1 },
    ]);
  });

  it('sin reseñas no hay promedios', () => {
    expect(service.promediar([])).toEqual([]);
  });
});
