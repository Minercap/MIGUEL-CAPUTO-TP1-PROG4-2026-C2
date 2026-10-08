import { PrecioPipe } from './precio-pipe';

describe('PrecioPipe', () => {
  const pipe = new PrecioPipe();

  it('separa los miles con un punto', () => {
    expect(pipe.transform(9000)).toBe('$9.000');
    expect(pipe.transform(18000)).toBe('$18.000');
    expect(pipe.transform(1250000)).toBe('$1.250.000');
  });

  it('no agrega decimales a un monto entero', () => {
    expect(pipe.transform(0)).toBe('$0');
    expect(pipe.transform(500)).toBe('$500');
  });

  it('muestra los centavos, con dos cifras, solo si el monto los tiene', () => {
    expect(pipe.transform(1498.5)).toBe('$1.498,50');
    expect(pipe.transform(8491.25)).toBe('$8.491,25');
  });
});
