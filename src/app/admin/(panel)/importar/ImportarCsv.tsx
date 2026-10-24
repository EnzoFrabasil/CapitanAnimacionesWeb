"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { claseBoton, claseTarjeta } from "@/components/admin/estilos";
import type { PlanImportacion } from "@/lib/csv/inscriptos";
import { aplicarImportacion, previsualizarImportacion } from "./acciones";

/** Lee el archivo como UTF-8; si no lo es (Excel "CSV delimitado por comas"), como Windows-1252. */
async function leerTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function ImportarCsv() {
  const [texto, setTexto] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [plan, setPlan] = useState<PlanImportacion | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const elegirArchivo = async (archivo: File | undefined) => {
    setPlan(null);
    setMensaje(null);
    setTexto(null);
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    // Excel guarda por defecto en .xlsx: ese formato no se puede leer como texto.
    if (/.xlsx?$/i.test(archivo.name)) {
      setMensaje({
        ok: false,
        texto:
          "Ese archivo es un libro de Excel (.xlsx), no un CSV. En Excel andá a Archivo → Guardar como, elegí el tipo \"CSV UTF-8 (delimitado por comas)\" y subí ese archivo.",
      });
      return;
    }
    const contenido = await leerTexto(archivo);
    setTexto(contenido);
    iniciar(async () => {
      const r = await previsualizarImportacion(contenido);
      if (r.ok) setPlan(r.plan);
      else setMensaje({ ok: false, texto: r.error });
    });
  };

  const aplicar = () => {
    if (!texto) return;
    iniciar(async () => {
      const r = await aplicarImportacion(texto);
      if (r.ok) {
        setMensaje({
          ok: true,
          texto:
            `Se aplicaron los cambios de ${r.aplicadas} ${r.aplicadas === 1 ? "fila" : "filas"}.` +
            (r.conError > 0 ? ` ${r.conError} con errores no se aplicaron.` : ""),
        });
        setPlan(null);
        setTexto(null);
      } else {
        setMensaje({ ok: false, texto: r.error });
      }
    });
  };

  return (
    <div className="space-y-5">
      <section className={claseTarjeta}>
        <label htmlFor="archivo-csv" className="mb-2 block font-semibold text-marino">
          Elegí el archivo CSV modificado
        </label>
        <input
          id="archivo-csv"
          type="file"
          accept=".csv,text/csv,.txt,.xlsx,.xls"
          onChange={(e) => {
            void elegirArchivo(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marino file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <p className="mt-2 text-xs">
          Usá el archivo de &quot;Descargar CSV&quot;. Se cruza por la columna <code>id</code>: solo se actualizan registros
          existentes, las filas sin id o con un id inexistente se ignoran y las filas que no estén en el archivo no se
          borran. Primero vas a ver una vista previa; nada se guarda hasta que confirmes.
        </p>
        {pendiente && <p className="mt-3 text-sm text-marino">Procesando…</p>}
      </section>

      {mensaje && (
        <p role={mensaje.ok ? "status" : "alert"} className={`rounded-xl border-2 p-4 font-medium ${mensaje.ok ? "border-verde text-marino" : "border-rojo text-rojo"}`}>
          {mensaje.texto}
        </p>
      )}

      {plan && <VistaPrevia plan={plan} nombreArchivo={nombreArchivo} pendiente={pendiente} aplicar={aplicar} />}
    </div>
  );
}

function VistaPrevia({
  plan,
  nombreArchivo,
  pendiente,
  aplicar,
}: {
  plan: PlanImportacion;
  nombreArchivo: string;
  pendiente: boolean;
  aplicar: () => void;
}) {
  if (plan.errorGeneral) {
    return (
      <p role="alert" className="rounded-xl border-2 border-rojo p-4 font-medium text-rojo">
        {plan.errorGeneral}
      </p>
    );
  }
  const advertencias = plan.cambios.filter((c) => c.advertencias.length > 0);

  return (
    <div className="space-y-5">
      <section className={claseTarjeta} aria-labelledby="resumen-importacion">
        <h2 id="resumen-importacion" className="text-lg font-semibold text-marino">
          Vista previa de {nombreArchivo}
        </h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <li>Filas leídas: <strong>{plan.filasLeidas}</strong></li>
          <li>Filas con cambios: <strong>{plan.cambios.length}</strong></li>
          <li>Filas sin cambios: <strong>{plan.sinCambios}</strong></li>
          <li className={plan.errores.length ? "font-semibold text-rojo" : ""}>Filas con errores (no se aplican): {plan.errores.length}</li>
          <li>Filas ignoradas: <strong>{plan.ignoradas.length}</strong></li>
          {plan.columnasIgnoradas.length > 0 && (
            <li className="sm:col-span-2 text-xs">
              Columnas que no se importan (calculadas o desconocidas): {plan.columnasIgnoradas.join(", ")}
            </li>
          )}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={aplicar} disabled={pendiente || plan.cambios.length === 0} className={claseBoton.destacado}>
            {pendiente ? "Aplicando…" : `Aplicar cambios de ${plan.cambios.length} ${plan.cambios.length === 1 ? "fila" : "filas"}`}
          </button>
          {plan.cambios.length === 0 && <span className="text-sm">No hay cambios para aplicar.</span>}
        </div>
      </section>

      {advertencias.length > 0 && (
        <section className="rounded-2xl border border-amarillo bg-amarillo/15 p-5" aria-labelledby="advertencias-importacion">
          <h2 id="advertencias-importacion" className="font-semibold text-marino">
            Atención: contactos compartidos
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-marino">
            {advertencias.map((c) => (
              <li key={c.fila}>
                Fila {c.fila} ({c.nino}): {c.advertencias.join(" ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.cambios.length > 0 && (
        <section className={claseTarjeta} aria-labelledby="cambios-importacion">
          <h2 id="cambios-importacion" className="mb-3 text-lg font-semibold text-marino">
            Cambios
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-marino uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3">Fila</th>
                  <th scope="col" className="py-2 pr-3">Niño/a</th>
                  <th scope="col" className="py-2 pr-3">Campo</th>
                  <th scope="col" className="py-2">Valor anterior → valor nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marino/10">
                {plan.cambios.flatMap((c) =>
                  c.campos.map((campo, i) => (
                    <tr key={`${c.fila}-${campo.columna}`} className="align-top">
                      <td className="py-2 pr-3">{i === 0 ? c.fila : ""}</td>
                      <td className="py-2 pr-3">
                        {i === 0 && (
                          <Link href={`/admin/inscriptos/${c.id}`} className="font-semibold text-marino underline" target="_blank">
                            {c.nino}
                          </Link>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{campo.columna}</td>
                      <td className="py-2">
                        <span className="text-texto/80 line-through decoration-rojo/60">{campo.anterior}</span>
                        <span aria-hidden className="mx-2 text-marino">→</span>
                        <span className="sr-only"> cambia a </span>
                        <span className="font-semibold text-marino">{campo.nuevo}</span>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {plan.errores.length > 0 && (
        <section className="rounded-2xl border border-rojo/40 bg-white p-5" aria-labelledby="errores-importacion">
          <h2 id="errores-importacion" className="font-semibold text-rojo">
            Filas con errores (no se aplican)
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {plan.errores.map((e) => (
              <li key={e.fila}>
                <strong>Fila {e.fila}</strong>
                {e.id !== null && ` (id ${e.id})`}:
                <ul className="list-disc pl-5 text-rojo">
                  {e.mensajes.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.ignoradas.length > 0 && (
        <section className={claseTarjeta} aria-labelledby="ignoradas-importacion">
          <h2 id="ignoradas-importacion" className="font-semibold text-marino">
            Filas ignoradas
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {plan.ignoradas.map((i) => (
              <li key={i.fila}>
                Fila {i.fila}: {i.motivo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
