# Consulta a la cátedra — 06/10

Preguntas que se le hicieron a la cátedra el 06/10/2026 y sus respuestas. Complementa
`docs/correccion-01-10.md`.

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Hay que usar todos los temas vistos en clase (HttpClient, interceptor, directiva propia, etc.)? | **No es obligatorio.** Con lo usado alcanza |
| 2 | ¿Hasta cuándo se puede commitear? ¿Qué se evalúa? | **Hasta el jueves 08/10 a las 18:30.** Evalúan la app desplegada en Vercel; no ven Supabase |
| 3 | ¿Cómo es el oral? | **Sin demo.** Preguntas sobre las decisiones y sobre dónde y cómo se aplica cada concepto (por ejemplo, lazy loading) |
| 4 | ¿Hay que declarar el uso de IA? | **No** |
| 5 | La facturación por día, ¿incluye las compras canceladas? | **Sí.** Confirma D-56 |
| 6 | Para la alerta de Próximamente, ¿alcanza con el push diario más el aviso dentro de la app? | **Alcanza.** Confirma D-52 |
| 7 | ¿Se pueden usar funciones de Postgres llamadas con `rpc()`? | **Permitidas** |
| 8 | ¿Hay que cambiar la clave anon legacy por las claves nuevas? | **No**, queda como está (D-10) |

## Qué cambia

- Los temas de clase sin usar (HttpClient, interceptor, directiva propia) dejan de ser
  algo que falta para entregar. Igual conviene saber explicar por qué no hicieron falta:
  todo el acceso a datos va por `supabase-js`, que no pasa por `HttpClient`.
- Como evalúan en Vercel y no ven Supabase, el SQL pendiente tiene que estar corrido antes
  del jueves 08/10 a las 18:30, y lo que se muestra tiene que funcionar en producción.
- Para el oral sirve `docs/decisiones.md`: cada decisión dice qué se eligió, qué se
  descartó y de qué clase sale.
