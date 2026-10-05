import { Service, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { Butaca, ButacaOcupada, FilaDeSala, FuncionParaComprar } from '../interfaces/compra';
import { Funcion } from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Sala } from '../interfaces/sala';
import { Resultado } from '../interfaces/resultado';
import { armarFecha, hoy, sumarDias, textoAFecha } from '../validadores/validadores';

// ---------- La sala (R-13, D-04) ----------
// Todas las salas tienen la misma forma, así que no se guarda en la base:
// vive acá como constantes (D-07). La función realizar_compra de la base
// valida las butacas con estas mismas reglas (schema.sql, sección 11.4):
// si cambia una, hay que cambiar la otra.

// 20 filas, de la A a la T. split('') separa el texto letra por letra.
const LETRAS_DE_FILAS = 'ABCDEFGHIJKLMNOPQRST'.split('');
// Tres bloques separados por dos pasillos: 4, 20 y 4 butacas (28 por fila).
const BLOQUES_COMUNES = [4, 20, 4];
// Las filas accesibles tienen 2, 10 y 2 (14 por fila).
const BLOQUES_ACCESIBLES = [2, 10, 2];
const FILAS_ACCESIBLES = ['J', 'K'];
const FILAS_VIP = ['R', 'S', 'T'];

// Hasta cuántas butacas se pueden llevar en una compra.
export const MAXIMO_BUTACAS = 10;

// Con preventa habilitada, la venta abre esta cantidad de días antes del
// estreno (R-11).
const DIAS_DE_PREVENTA = 7;

// La compra de entradas (R-13 a R-16, R-20). En esta parte: los datos de
// la función, el mapa de la sala, las butacas ocupadas en tiempo real y
// las reglas de venta y de precio. Ningún método muestra nada: devuelven
// el error ya traducido para la pantalla.
//
// Las reglas de venta y de precio están también en la base, que es la que
// decide de verdad al momento de pagar (D-39). Acá se repiten para poder
// mostrarle al comprador el precio y los avisos antes de que pague.
@Service()
export class Compras {
  private sup = inject(SupabaseService);

  // El canal de Realtime abierto, si hay uno. Lo guarda el servicio para
  // poder cerrarlo después; los componentes no tocan supabase-js.
  private canal: RealtimeChannel | null = null;

  // La función, su película y su sala: tres consultas con .single() (D-16).
  async traerFuncion(funcionId: number): Promise<Resultado<FuncionParaComprar>> {
    const { data, error } = await this.sup.Sup.from('Funciones')
      .select('*')
      .eq('id', funcionId)
      .single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe esa función.' : 'No se pudo cargar la función.';
      return { datos: null, error: mensaje };
    }
    const funcion: Funcion = data;

    const { data: dataPelicula, error: errorPelicula } = await this.sup.Sup.from('Peliculas')
      .select('*')
      .eq('id', funcion.pelicula_id)
      .single();
    if (errorPelicula) return { datos: null, error: 'No se pudo cargar la película.' };
    const pelicula: Pelicula = dataPelicula;

    const { data: dataSala, error: errorSala } = await this.sup.Sup.from('Salas')
      .select('*')
      .eq('id', funcion.sala_id)
      .single();
    if (errorSala) return { datos: null, error: 'No se pudo cargar la sala.' };
    const sala: Sala = dataSala;

    return { datos: { funcion, pelicula, sala_nombre: sala.nombre }, error: null };
  }

  // Las butacas de esa función que ya están vendidas (D-38).
  async traerOcupadas(funcionId: number): Promise<Resultado<ButacaOcupada[]>> {
    const { data, error } = await this.sup.Sup.from('ButacasOcupadas')
      .select('*')
      .eq('funcion_id', funcionId);
    if (error) return { datos: null, error: 'No se pudieron cargar las butacas ocupadas.' };

    const filas: ButacaOcupada[] = data;
    return { datos: filas, error: null };
  }

  // Realtime con postgres_changes (clase 6): cada vez que se inserta una
  // fila en ButacasOcupadas para esta función, se llama a alOcupar con esa
  // butaca. Es lo que hace que el mapa se actualice solo cuando otra
  // persona compra (R-16).
  //
  // filter (D-38) limita los avisos a las filas de esta función: sin él
  // llegarían las butacas vendidas de todas las funciones del cine.
  // 'funcion_id=eq.12' se lee "funcion_id igual a 12".
  //
  // Solo se escucha INSERT: una butaca ocupada es siempre una fila nueva.
  escucharOcupadas(funcionId: number, alOcupar: (butaca: ButacaOcupada) => void) {
    this.dejarDeEscuchar();

    this.canal = this.sup.Sup.channel(`butacas-funcion-${funcionId}`);
    this.canal
      .on<ButacaOcupada>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ButacasOcupadas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        // payload.new es la fila recién insertada.
        (payload) => alOcupar(payload.new),
      )
      .subscribe();
  }

  // Cierra el canal. La pantalla lo llama en ngOnDestroy (clase 6): si no,
  // el canal seguiría abierto y avisando a una pantalla que ya no existe.
  dejarDeEscuchar() {
    if (this.canal) {
      this.canal.unsubscribe();
      this.canal = null;
    }
  }

  // Arma el mapa: las 20 filas, cada una con sus tres bloques de butacas.
  // La numeración es corrida dentro de la fila: en una fila común, el
  // primer bloque tiene de la 1 a la 4, el del medio de la 5 a la 24 y el
  // último de la 25 a la 28.
  armarSala(): FilaDeSala[] {
    return LETRAS_DE_FILAS.map((letra) => {
      const esAccesible = FILAS_ACCESIBLES.includes(letra);
      const esVip = FILAS_VIP.includes(letra);
      const tamanios = esAccesible ? BLOQUES_ACCESIBLES : BLOQUES_COMUNES;

      let numero = 0;
      const bloques = tamanios.map((cantidad) => {
        const bloque: Butaca[] = [];
        for (let i = 0; i < cantidad; i++) {
          numero++;
          bloque.push({ fila: letra, numero, es_vip: esVip, es_accesible: esAccesible });
        }
        return bloque;
      });

      return { letra, bloques };
    });
  }

  // ---------- Reglas de venta y de precio (R-11, R-14, D-39) ----------

  // Desde qué día se venden entradas de una película: 7 días antes del
  // estreno si tiene preventa; si no, el día del estreno.
  inicioDeVenta(pelicula: Pelicula): Date {
    // fecha_estreno es obligatoria en la base; hoy() queda solo para que
    // el tipo no sea null.
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno)) ?? hoy();
    return pelicula.preventa_habilitada ? sumarDias(estreno, -DIAS_DE_PREVENTA) : estreno;
  }

  ventaAbierta(pelicula: Pelicula): boolean {
    return hoy() >= this.inicioDeVenta(pelicula);
  }

  // Está en preventa mientras no llegó el día del estreno. Desde ese día
  // el precio vuelve al normal sin que nadie toque nada.
  enPreventa(pelicula: Pelicula): boolean {
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno)) ?? hoy();
    return pelicula.preventa_habilitada && hoy() < estreno;
  }

  // Lo que cuesta una butaca en una función:
  //   VIP: siempre precio_vip, también en preventa.
  //   Comunes y accesibles: precio_preventa durante la preventa; si no,
  //   precio_base. Las accesibles valen lo mismo que las comunes.
  precioDe(butaca: Butaca, funcion: Funcion, pelicula: Pelicula): number {
    if (butaca.es_vip) return funcion.precio_vip;
    if (this.enPreventa(pelicula) && pelicula.precio_preventa !== null) {
      return pelicula.precio_preventa;
    }
    return funcion.precio_base;
  }
}
