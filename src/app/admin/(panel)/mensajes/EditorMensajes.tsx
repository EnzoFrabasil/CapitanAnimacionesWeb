"use client";

import { startTransition, useActionState, useState } from "react";
import { claseBoton, claseEtiqueta, claseInput } from "@/components/admin/estilos";
import { MensajeResultado } from "@/components/admin/FormAccion";
import { LARGO_MAXIMO_DATOS_PAGO, LARGO_MAXIMO_PLANTILLA } from "@/config/mensajes";
import { NOMBRE_PLANTILLA, PLANTILLAS, VARIABLES, armarMensaje, variablesDeMensaje, type DatosMensaje, type Plantilla } from "@/lib/dominio/mensajes";
import { totalFamilia } from "@/lib/dominio/opciones";
import { guardarMensajesWhatsapp } from "./acciones";

/** Familia de ejemplo para la vista previa (dos hermanos, con descuento y grupo de WhatsApp). */
const EJEMPLO: Omit<DatosMensaje, "datosPago"> = {
  contacto: "Laura",
  marca: "Capitán Animaciones",
  temporada: "Colonia de verano 2027",
  chicos: [
    {
      nombre: "Juana",
      asistencia: "Colonia completa · 8:30 a 12:30 hs",
      fechas: "Quincena 1 y Quincena 2 (4/1 al 29/1) · 8:30 a 12:30 hs",
      precio: 230000,
      grupo: { nombre: "Grupo 2 (6 a 7)", enlaceWhatsapp: "https://chat.whatsapp.com/EjemploDeGrupo1" },
    },
    {
      nombre: "Pedro",
      asistencia: "Quincena 1 · 8:30 a 12:30 hs",
      fechas: "Quincena 1 (4/1 al 15/1) · 8:30 a 12:30 hs",
      precio: 130000,
      grupo: { nombre: "Grupo 1 (4 a 5)", enlaceWhatsapp: null },
    },
  ],
  total: totalFamilia([230000, 130000], 10),
  porcentajeDescuento: 10,
};

/** Burbuja tipo WhatsApp con el texto (los *asteriscos* van en negrita, como en WhatsApp). */
function Burbuja({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap text-[#111b21] shadow-sm">
      {texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
        /^\*[^*\n]+\*$/.test(parte) ? <strong key={i}>{parte.slice(1, -1)}</strong> : <span key={i}>{parte}</span>,
      )}
    </div>
  );
}

export function EditorMensajes({ inicial }: { inicial: { plantillas: Record<Plantilla, string>; datosPago: string } }) {
  const [plantillas, setPlantillas] = useState(inicial.plantillas);
  const [datosPago, setDatosPago] = useState(inicial.datosPago);
  const [resultado, ejecutar, pendiente] = useActionState(guardarMensajesWhatsapp, null);
  const variables = variablesDeMensaje({ ...EJEMPLO, datosPago });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => ejecutar(datos));
      }}
    >
      <section className="rounded-2xl border border-marino/10 bg-white p-5 shadow-sm">
        <label htmlFor="datosPago" className="text-lg font-semibold text-marino">
          Datos de pago
        </label>
        <p className="mt-1 text-sm text-texto/80">Se agregan donde pongas {"{datosPago}"} (por defecto, al final del mensaje del monto).</p>
        <textarea
          id="datosPago"
          name="datosPago"
          rows={3}
          maxLength={LARGO_MAXIMO_DATOS_PAGO}
          value={datosPago}
          onChange={(e) => setDatosPago(e.target.value)}
          placeholder={"Alias: capitan.colonia\nCBU: 0000000000000000000000\nTitular: Nombre Apellido"}
          className={`${claseInput} mt-3`}
        />
      </section>

      {PLANTILLAS.map((p) => (
        <section key={p} className="rounded-2xl border border-marino/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-marino">{NOMBRE_PLANTILLA[p].nombre}</h2>
          <p className="mt-1 text-sm text-texto/80">{NOMBRE_PLANTILLA[p].descripcion}.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor={`plantilla-${p}`} className={claseEtiqueta}>
                Texto
              </label>
              <textarea
                id={`plantilla-${p}`}
                name={p}
                rows={12}
                maxLength={LARGO_MAXIMO_PLANTILLA}
                value={plantillas[p]}
                onChange={(e) => setPlantillas((t) => ({ ...t, [p]: e.target.value }))}
                className={`${claseInput} font-mono text-[13px]`}
              />
            </div>
            <div>
              <p className={claseEtiqueta}>Así llega (ejemplo con dos hermanos)</p>
              <div className="rounded-xl bg-[#efeae2] p-3">
                <Burbuja texto={armarMensaje(plantillas[p], variables)} />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-marino/10 bg-crema/60 p-5">
        <h2 className="text-lg font-semibold text-marino">Palabras que se reemplazan solas</h2>
        <p className="mt-1 text-sm text-texto/80">
          Escribilas entre llaves, tal cual. Para poner algo en negrita en WhatsApp, rodealo con asteriscos: *así*.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {VARIABLES.map((v) => (
            <div key={v.clave}>
              <dt className="inline font-mono font-semibold text-marino">{`{${v.clave}}`}</dt>
              <dd className="inline text-texto/80"> · {v.descripcion}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-marino/10 bg-white/95 py-3">
        <button type="submit" disabled={pendiente} className={claseBoton.primario}>
          {pendiente ? "Guardando…" : "Guardar mensajes"}
        </button>
        <div aria-live="polite">
          <MensajeResultado resultado={resultado} />
        </div>
      </div>
    </form>
  );
}
