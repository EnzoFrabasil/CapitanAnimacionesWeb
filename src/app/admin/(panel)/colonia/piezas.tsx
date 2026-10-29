import { Campo } from "@/components/admin/Campo";
import { fechaAIso } from "@/lib/dominio/fechas";
import { formatearPrecio, horarios, rangoDeFechas, type Opcion, type Precios } from "@/lib/dominio/opciones";
import { formatearFecha } from "@/lib/formato";

// Piezas de las páginas de La colonia (formularios y vista previa).

export function Casilla({ nombre, valor, etiqueta, marcada }: { nombre: string; valor?: string; etiqueta: string; marcada: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={nombre} value={valor} defaultChecked={marcada} className="size-4 accent-marino" />
      {etiqueta}
    </label>
  );
}

/** "Quincena 2" → "Quincena 3"; si no termina en número, vacío. */
export function siguienteNombre(nombre: string) {
  const m = nombre.match(/^(.*\D)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : "";
}

export function CamposOpcion({
  prefijo,
  opcion,
}: {
  prefijo: string;
  opcion: {
    numero: number;
    nombre: string;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    horaInicio: string;
    horaFin: string;
    precio: number | null;
    activa: boolean;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <Campo nombre="nombre" etiqueta="Nombre" valor={opcion.nombre} requerido idPrefijo={prefijo} className="col-span-2 sm:col-span-4" ayuda="Ej. Quincena 1, Semana 2, Enero." />
      <Campo nombre="numero" etiqueta="Orden" tipo="number" min={1} valor={opcion.numero} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={opcion.fechaInicio ? fechaAIso(opcion.fechaInicio) : ""} requerido idPrefijo={prefijo} className="sm:col-span-3" />
      <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={opcion.fechaFin ? fechaAIso(opcion.fechaFin) : ""} requerido idPrefijo={prefijo} className="sm:col-span-3" />
      <Campo nombre="horaInicio" etiqueta="Hora de entrada" tipo="time" valor={opcion.horaInicio} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="horaFin" etiqueta="Hora de salida" tipo="time" valor={opcion.horaFin} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="precio" etiqueta="Precio ($)" tipo="number" min={0} valor={opcion.precio} requerido idPrefijo={prefijo} className="col-span-2 sm:col-span-2" />
      <div className="col-span-2 sm:col-span-6">
        <Casilla nombre="activa" etiqueta="Activa (se ofrece en el formulario)" marcada={opcion.activa} />
      </div>
    </div>
  );
}

/** Resumen de lo que aparece en el formulario público. */
export function VistaPrevia({ opciones, precios, porDia }: { opciones: Opcion[]; precios: Precios; porDia: boolean }) {
  if (opciones.length === 0) return <p className="text-sm">No hay opciones activas.</p>;
  return (
    <div className="space-y-4 text-sm">
      {horarios(opciones).map((h) => (
        <div key={h.clave}>
          <p className="mb-1 font-semibold text-marino">Horario: {h.texto}</p>
          <ul className="space-y-1">
            {precios.paquetes
              .filter((p) => p.opciones.length > 0 && p.opciones.every((id) => h.opciones.some((o) => o.id === id)))
              .map((p) => {
                const rango = rangoDeFechas(h.opciones.filter((o) => p.opciones.includes(o.id)));
                return (
                  <li key={`paquete-${p.id}`} className="flex justify-between gap-3 rounded-lg bg-amarillo/30 px-3 py-1.5 font-semibold">
                    <span>
                      {p.nombre}{" "}
                      <span className="font-normal">
                        ({formatearFecha(rango.desde)} al {formatearFecha(rango.hasta)})
                      </span>
                    </span>
                    <span className="tabular-nums">{formatearPrecio(p.precio)}</span>
                  </li>
                );
              })}
            {h.opciones.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 rounded-lg border border-marino/10 px-3 py-1.5">
                <span>
                  {o.nombre}{" "}
                  <span className="text-texto/80">
                    ({formatearFecha(o.fechaInicio)} al {formatearFecha(o.fechaFin)})
                  </span>
                </span>
                <span className="tabular-nums">{formatearPrecio(o.precio)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {porDia && <p>También pueden elegir días sueltos ({precios.dia === null ? "precio a confirmar" : `${formatearPrecio(precios.dia)} por día`}).</p>}
      {precios.descuentoHermanos > 0 && (
        <p>Con 2 o más hermanos: {precios.descuentoHermanos}% de descuento sobre el total de la familia.</p>
      )}
    </div>
  );
}
