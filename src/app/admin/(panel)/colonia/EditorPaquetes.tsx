import { Campo } from "@/components/admin/Campo";
import { FormAccion } from "@/components/admin/FormAccion";
import { horarios, rangoDeFechas, type Opcion } from "@/lib/dominio/opciones";
import { formatearFecha } from "@/lib/formato";
import { eliminarPaquete, guardarPaquete } from "./acciones";

interface PaqueteEditable {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
  opciones: number[];
}

/** Casillas de opciones agrupadas por horario (un paquete solo puede tener opciones de un horario). */
function OpcionesDelPaquete({ prefijo, opciones, marcadas }: { prefijo: string; opciones: Opcion[]; marcadas: number[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-marino">Incluye</legend>
      {horarios(opciones).map((h) => (
        <div key={h.clave}>
          {horarios(opciones).length > 1 && <p className="text-xs font-semibold text-texto/70">{h.texto}</p>}
          <div className="flex flex-wrap gap-2">
            {h.opciones.map((o) => (
              <label key={o.id} htmlFor={`${prefijo}-op-${o.id}`} className="flex items-center gap-2 rounded-lg border border-marino/20 px-3 py-1.5 text-sm">
                <input id={`${prefijo}-op-${o.id}`} type="checkbox" name="opciones" value={o.id} defaultChecked={marcadas.includes(o.id)} className="size-4 accent-marino" />
                {o.nombre}
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

/**
 * Paquetes de precio de la temporada ("Colonia completa" = Quincena 1 + 2, etc.).
 * Un chico paga la combinación más barata de paquetes y opciones sueltas.
 */
export function EditorPaquetes({ temporadaId, opciones, paquetes }: { temporadaId: number; opciones: Opcion[]; paquetes: PaqueteEditable[] }) {
  if (opciones.length < 2) {
    return <p className="text-sm">Para armar un paquete hacen falta al menos 2 opciones (se cargan en Fechas y horarios).</p>;
  }
  return (
    <div className="space-y-4">
      {paquetes.length === 0 && <p className="text-sm">Todavía no hay paquetes: cada opción se cobra por separado.</p>}
      {paquetes.map((p) => {
        const incluidas = opciones.filter((o) => p.opciones.includes(o.id));
        const rango = incluidas.length ? rangoDeFechas(incluidas) : null;
        const suma = incluidas.reduce((t, o) => t + o.precio, 0);
        return (
          <article key={p.id} className={`rounded-xl border-2 p-4 ${p.activo ? "border-marino/20" : "border-dashed border-marino/15 bg-marino/[0.03]"}`}>
            <p className="mb-2 text-xs text-texto/80">
              {rango ? `${formatearFecha(rango.desde)} al ${formatearFecha(rango.hasta)}` : "Sin opciones"}
              {incluidas.length > 0 && ` · por separado sumarían $ ${suma.toLocaleString("es-AR")}`}
              {!p.activo && " · desactivado (no se ofrece ni se aplica)"}
            </p>
            <FormAccion accion={guardarPaquete.bind(null, temporadaId, p.id)} textoBoton="Guardar paquete" variante="secundario">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Campo nombre="nombre" etiqueta="Nombre" valor={p.nombre} requerido idPrefijo={`paquete-${p.id}`} />
                <Campo nombre="precio" etiqueta="Precio ($)" tipo="number" min={0} valor={p.precio} requerido idPrefijo={`paquete-${p.id}`} />
              </div>
              <div className="mt-3">
                <OpcionesDelPaquete prefijo={`paquete-${p.id}`} opciones={opciones} marcadas={p.opciones} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" name="activo" defaultChecked={p.activo} className="size-4 accent-marino" />
                Activo (se ofrece en el formulario y se aplica a los precios)
              </label>
            </FormAccion>
            <FormAccion accion={eliminarPaquete.bind(null, temporadaId, p.id)} textoBoton="Eliminar paquete" textoPendiente="Eliminando…" variante="peligro" className="mt-2" />
          </article>
        );
      })}

      <details className="rounded-xl border-2 border-dashed border-marino/25 p-4" open={paquetes.length === 0}>
        <summary className="cursor-pointer font-semibold text-marino">+ Crear paquete</summary>
        <FormAccion accion={guardarPaquete.bind(null, temporadaId, null)} textoBoton="Crear paquete" textoPendiente="Creando…" className="mt-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <Campo nombre="nombre" etiqueta="Nombre" valor="Colonia completa" requerido idPrefijo="paquete-nuevo" />
            <Campo nombre="precio" etiqueta="Precio ($)" tipo="number" min={0} requerido idPrefijo="paquete-nuevo" />
          </div>
          <div className="mt-3">
            <OpcionesDelPaquete prefijo="paquete-nuevo" opciones={opciones} marcadas={[]} />
          </div>
        </FormAccion>
      </details>
    </div>
  );
}
