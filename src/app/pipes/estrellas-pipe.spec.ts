import { EstrellasPipe } from './estrellas-pipe';

describe('EstrellasPipe', () => {
  const pipe = new EstrellasPipe();

  it('muestra tantas estrellas llenas como la calificación', () => {
    expect(pipe.transform(1)).toBe('★☆☆☆☆');
    expect(pipe.transform(5)).toBe('★★★★★');
  });

  it('redondea los promedios al entero más cercano', () => {
    expect(pipe.transform(3.6)).toBe('★★★★☆');
    expect(pipe.transform(3.4)).toBe('★★★☆☆');
  });
});
