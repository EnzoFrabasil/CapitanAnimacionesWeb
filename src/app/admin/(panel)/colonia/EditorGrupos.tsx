"use client";

import { startTransition, useActionState, useState } from "react";
import { claseBoton, claseInput } from "@/components/admin/estilos";
import { MensajeResultado } from "@/components/admin/FormAccion";
import type { AccionPanel } from "@/lib/admin/resultado";
import { gruposTemporadaSchema } from "@/lib/validacion/grupos";

interface Fila {
  clave: number;
  id?: number;
  nombre: string;
  edadMin: string;
  edadMax: string;
  enlaceWhatsapp: string;
}

export function EditorGrupos({
  accion,
  grupos,
}: {
  accion: AccionPanel;
  grupos: { id: number; nombre: string; edadMin: number; edadMax: number; enlaceWhatsapp: string | null }[];
}) {
  const [filas, setFilas] = useState<Fila[]>(() =>
    grupos.map((g, i) => ({ clave: i, id: g.id, nombre: g.nombre, edadMin: String(g.edadMin), edadMax: String(g.edadMax), enlaceWhatsapp: g.enlaceWhatsapp ?? "" })),
  );
  const [proxima, setProxima] = useState(grupos.length);
  const [resultado, ejecutar, pendiente] = useActionState(accion, null);

  const datos = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    edadMin: f.edadMin === "" ? Number.NaN : Number(f.edadMin),
    edadMax: f.edadMax === "" ? Number.NaN : Number(f.edadMax),
    enlaceWhatsapp: f.enlaceWhatsapp,
  }));
  const validacion = gruposTemporadaSchema.safeParse(datos);
  const errores = validacion.success ? [] : [...new Set(validacion.error.issues.map((i) => i.message))];
  const borrados = grupos.filter((g) => !filas.some((f) => f.id === g.id));

  const cambiar = (clave: number, campo: "nombre" | "edadMin" | "edadMax" | "enlaceWhatsapp", valor: string) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validacion.success) return;
        const fd = new FormData();
        fd.set("grupos", JSON.stringify(datos));
        startTransition(() => ejecutar(fd));
      }}
    >
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-marino uppercase">
          <tr>
            <th scope="col" className="py-2 pr-2">Nombre</th>
            <th scope="col" className="w-24 py-2 pr-2">Edad mín.</th>
            <th scope="col" className="w-24 py-2 pr-2">Edad máx.</th>
            <th scope="col" className="py-2 pr-2">Grupo de WhatsApp de papis (opcional)</th>
            <th scope="col" className="w-10 py-2"><span className="sr-only">Quitar</span></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.clave}>
              <td className="py-1 pr-2">
                <input aria-label={`Nombre del grupo ${i + 1}`} value={f.nombre} onChange={(e) => cambiar(f.clave, "nombre", e.target.value)} className={claseInput} />
              </td>
              <td className="py-1 pr-2">
                <input aria-label={`Edad mínima del grupo ${i + 1}`} type="number" min={0} value={f.edadMin} onChange={(e) => cambiar(f.clave, "edadMin", e.target.value)} className={claseInput} />
              </td>
              <td className="py-1 pr-2">
                <input aria-label={`Edad máxima del grupo ${i + 1}`} type="number" min={0} value={f.edadMax} onChange={(e) => cambiar(f.clave, "edadMax", e.target.value)} className={claseInput} />
              </td>
              <td className="py-1 pr-2">
                <input
                  aria-label={`Link del grupo de WhatsApp de papis del grupo ${f.nombre || i + 1}`}
                  type="url"
                  inputMode="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={f.enlaceWhatsapp}
                  onChange={(e) => cambiar(f.clave, "enlaceWhatsapp", e.target.value)}
                  className={claseInput}
                />
              </td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                  aria-label={`Quitar el grupo ${f.nombre || i + 1}`}
                  className="rounded-lg px-2 py-1 text-lg leading-none text-rojo hover:bg-rojo/10"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <button
        type="button"
        onClick={() => {
          setFilas((fs) => [...fs, { clave: proxima, nombre: "", edadMin: "", edadMax: "", enlaceWhatsapp: "" }]);
          setProxima((n) => n + 1);
        }}
        className="mt-2 text-sm font-semibold text-marino underline"
      >
        + Agregar grupo
      </button>

      {errores.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-sm font-medium text-rojo" role="alert">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {borrados.length > 0 && (
        <p className="mt-3 text-sm text-marino">
          Al guardar se borran: {borrados.map((g) => g.nombre).join(", ")}. Los niños de esos grupos quedan sin grupo.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente || !validacion.success} className={claseBoton.primario}>
          {pendiente ? "Guardando…" : "Guardar grupos"}
        </button>
        <div aria-live="polite">
          <MensajeResultado resultado={resultado} />
        </div>
      </div>
      <p className="mt-2 text-xs">
        Editar los grupos no cambia el grupo de los niños ya inscriptos. El link del grupo de WhatsApp va en el mensaje de
        &quot;lugar confirmado&quot; (en WhatsApp: el grupo → Invitar al grupo mediante enlace → Copiar enlace).
      </p>
    </form>
  );
}
