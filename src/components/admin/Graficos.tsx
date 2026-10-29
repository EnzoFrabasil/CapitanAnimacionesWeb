import type { ReactNode } from "react";

// Gráficos simples en HTML para el panel (sin librerías). Cada marca muestra su
// valor al pasar el mouse o con el teclado, y cada gráfico tiene su tabla.

export const SERIES_ESTADO = [
  { clave: "confirmados", nombre: "Confirmados", clase: "bg-grafico-confirmado" },
  { clave: "contactados", nombre: "Contactados", clase: "bg-grafico-contactado" },
  { clave: "enEspera", nombre: "En espera", clase: "bg-grafico-espera" },
] as const;

type Clave = (typeof SERIES_ESTADO)[number]["clave"];
export type FilaEstado = { nombre: string } & Record<Clave, number>;

const totalFila = (f: FilaEstado) => SERIES_ESTADO.reduce((t, s) => t + f[s.clave], 0);

/** Recuadro que aparece arriba de la marca al pasar el mouse o enfocarla. */
function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-lg bg-marino px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-md group-hover:block group-focus-visible:block"
    >
      {children}
    </span>
  );
}

export function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto" aria-label="Referencias">
      {SERIES_ESTADO.map((s) => (
        <li key={s.clave} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-sm ${s.clase}`} />
          {s.nombre}
        </li>
      ))}
    </ul>
  );
}

/** Tabla con los mismos datos del gráfico (para leer los números exactos). */
function TablaDatos({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-marino">Ver como tabla</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{titulo}</caption>
        <thead className="text-xs text-texto/80">
          <tr>
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={`py-1 font-medium ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-marino/10">
          {filas.map((fila) => (
            <tr key={String(fila[0])}>
              {fila.map((v, i) => (
                <td key={i} className={`py-1 ${i > 0 ? "text-right tabular-nums" : ""}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/**
 * Barras horizontales apiladas por estado (confirmados, contactados y en espera), con el total
 * al final de cada barra. Todas comparten la misma escala.
 */
export function BarrasPorEstado({ titulo, filas }: { titulo: string; filas: FilaEstado[] }) {
  const maximo = Math.max(1, ...filas.map(totalFila));
  return (
    <div>
      <ul className="space-y-2.5">
        {filas.map((f) => {
          const total = totalFila(f);
          const segmentos = SERIES_ESTADO.filter((s) => f[s.clave] > 0);
          return (
            <li key={f.nombre} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 text-sm">
              <span className="truncate text-texto" title={f.nombre}>
                {f.nombre}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-5 gap-[2px]" style={{ width: `${(total / maximo) * 85}%` }}>
                  {segmentos.map((s, i) => (
                    <span
                      key={s.clave}
                      tabIndex={0}
                      aria-label={`${f.nombre}: ${f[s.clave]} ${s.nombre.toLowerCase()}`}
                      className={`group relative h-full min-w-1 outline-none focus-visible:ring-2 focus-visible:ring-azul ${s.clase} ${
                        i === segmentos.length - 1 ? "rounded-r" : ""
                      }`}
                      style={{ flexGrow: f[s.clave], flexBasis: 0 }}
                    >
                      <Tooltip>
                        {f.nombre} · {s.nombre}: <strong>{f[s.clave]}</strong>
                      </Tooltip>
                    </span>
                  ))}
                </div>
                <span className="text-xs font-semibold text-marino tabular-nums">{total}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <TablaDatos
        titulo={titulo}
        columnas={["", ...SERIES_ESTADO.map((s) => s.nombre), "Total"]}
        filas={filas.map((f) => [f.nombre, ...SERIES_ESTADO.map((s) => f[s.clave]), totalFila(f)])}
      />
    </div>
  );
}

const fechaCorta = (iso: string) => {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)}/${Number(mes)}`;
};

/** Columnas por día (una sola serie): chicos inscriptos según el día de alta. */
export function ColumnasPorDia({ titulo, dias }: { titulo: string; dias: { fecha: string; cantidad: number }[] }) {
  const maximo = Math.max(1, ...dias.map((d) => d.cantidad));
  const pico = dias.reduce((a, b) => (b.cantidad > a.cantidad ? b : a), dias[0]);
  return (
    <div>
      {/* Sin eje Y: el día pico lleva su valor y el resto se lee en el tooltip o la tabla. */}
      <div className="relative flex h-40 items-end gap-[2px] border-b border-marino/15 pt-5">
        {dias.map((d) => (
          <span
            key={d.fecha}
            tabIndex={0}
            aria-label={`${fechaCorta(d.fecha)}: ${d.cantidad} inscriptos`}
            className="group relative flex h-full flex-1 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            {/* Cada día ocupa el mismo ancho; la columna se limita a 24px y queda centrada. */}
            <span className="block w-full max-w-6 rounded-t bg-marino" style={{ height: `${(d.cantidad / maximo) * 100}%` }} />
            {d === pico && d.cantidad > 0 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-marino tabular-nums">
                {d.cantidad}
              </span>
            )}
            <Tooltip>
              {fechaCorta(d.fecha)}: <strong>{d.cantidad}</strong> {d.cantidad === 1 ? "inscripto" : "inscriptos"}
            </Tooltip>
          </span>
        ))}
      </div>
      {/* Primera y última fecha, centradas bajo su columna. */}
      <div className="mt-1 flex gap-[2px] text-xs text-texto/70">
        {dias.map((d, i) => (
          <span key={d.fecha} className="flex flex-1 justify-center whitespace-nowrap">
            {i === 0 || (i === dias.length - 1 && dias.length > 1) ? fechaCorta(d.fecha) : ""}
          </span>
        ))}
      </div>
      <TablaDatos
        titulo={titulo}
        columnas={["Día", "Inscriptos"]}
        filas={dias.filter((d) => d.cantidad > 0).map((d) => [fechaCorta(d.fecha), d.cantidad])}
      />
    </div>
  );
}
