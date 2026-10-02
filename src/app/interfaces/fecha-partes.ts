// El valor del grupo { dia, mes, anio } que maneja el componente
// campo-fecha (D-23). Son textos porque salen de un <select>: '' es "sin
// elegir", y el resto son números escritos como texto ('5', '12', '1996').
export interface FechaPartes {
  dia: string;
  mes: string;
  anio: string;
}
