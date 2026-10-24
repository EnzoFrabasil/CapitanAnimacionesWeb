"use client";

import { CLASES_ACENTO } from "@/components/marca/acentos";
import { IconoFlecha, IconoRed, IconoWhatsapp } from "@/components/marca/iconos";
import {
  COLORES_ACENTO,
  MAX_PREGUNTAS,
  MAX_REDES,
  MAX_SECCIONES,
  REDES,
  idSeccionNueva,
  type Contenido,
} from "@/lib/contenido/esquema";
import { urlWhatsapp } from "@/lib/contenido/urls";
import { Texto, rutaATexto, useEdicion, type Edicion, type Ruta } from "./editables";

// Partes de la página de inicio que en el editor tienen controles propios
// (agregar, quitar, ordenar) además del texto editable.

function mover<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  const [item] = copia.splice(desde, 1);
  copia.splice(hasta, 0, item);
  return copia;
}

const claseBotonChico =
  "rounded-full border-2 border-marino/20 bg-white px-3 py-1 text-sm font-semibold text-marino transition hover:border-marino disabled:opacity-40 disabled:hover:border-marino/20";

const claseBotonAgregar =
  "w-full rounded-2xl border-2 border-dashed border-marino/40 bg-white/70 px-4 py-4 font-titulo text-lg font-semibold text-marino transition hover:border-marino hover:bg-white";

function BotonesOrden({
  edicion,
  ruta,
  lista,
  indice,
  nombre,
}: {
  edicion: Edicion;
  ruta: Ruta;
  lista: readonly unknown[];
  indice: number;
  nombre: string;
}) {
  return (
    <>
      <button
        type="button"
        className={claseBotonChico}
        disabled={indice === 0}
        onClick={() => edicion.actualizar(ruta, mover(lista, indice, indice - 1))}
        aria-label={`Subir ${nombre}`}
      >
        ↑ Subir
      </button>
      <button
        type="button"
        className={claseBotonChico}
        disabled={indice === lista.length - 1}
        onClick={() => edicion.actualizar(ruta, mover(lista, indice, indice + 1))}
        aria-label={`Bajar ${nombre}`}
      >
        ↓ Bajar
      </button>
      <button
        type="button"
        className={`${claseBotonChico} text-rojo!`}
        onClick={() => {
          if (window.confirm(`¿Quitar ${nombre}? Vas a poder deshacerlo con "Descartar cambios" mientras no publiques.`)) {
            edicion.actualizar(
              ruta,
              lista.filter((_, i) => i !== indice),
            );
          }
        }}
      >
        Quitar
      </button>
    </>
  );
}

/** Barra de una sección de información: ordenar, color de acento y quitar. */
export function ControlesSeccion({ secciones, indice }: { secciones: Contenido["secciones"]; indice: number }) {
  const edicion = useEdicion();
  if (!edicion) return null;
  const seccion = secciones[indice];
  return (
    <div data-editor-ui="" className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center gap-2 font-sans">
      <span className="mr-1 text-sm font-semibold text-marino">Sección {indice + 1}</span>
      <BotonesOrden edicion={edicion} ruta={["secciones"]} lista={secciones} indice={indice} nombre="esta sección" />
      <span className="ml-2 text-sm text-marino">Color:</span>
      {COLORES_ACENTO.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Color ${color}`}
          aria-pressed={seccion.acento === color}
          onClick={() => edicion.actualizar(["secciones", indice, "acento"], color)}
          className={`size-6 rounded-full ${CLASES_ACENTO[color].punto} ${
            seccion.acento === color ? "ring-4 ring-marino ring-offset-2" : "ring-1 ring-marino/20"
          }`}
        />
      ))}
    </div>
  );
}

export function AgregarSeccion({ secciones }: { secciones: Contenido["secciones"] }) {
  const edicion = useEdicion();
  if (!edicion || secciones.length >= MAX_SECCIONES) return null;
  return (
    <div data-editor-ui="" className="mx-auto max-w-6xl px-4 pb-12">
      <button
        type="button"
        className={claseBotonAgregar}
        onClick={() =>
          edicion.actualizar(
            ["secciones"],
            [
              ...secciones,
              {
                id: idSeccionNueva(),
                titulo: "Nueva sección",
                texto: "Escribí acá el texto de la sección.",
                imagen: "/marca/capitan-timon.png",
                alt: "El capitán al timón",
                acento: COLORES_ACENTO[secciones.length % COLORES_ACENTO.length],
              },
            ],
          )
        }
      >
        + Agregar sección
      </button>
    </div>
  );
}

/** Preguntas frecuentes: desplegables en el sitio, tarjetas editables en el editor. */
export function ListaPreguntas({ lista }: { lista: Contenido["preguntas"]["lista"] }) {
  const edicion = useEdicion();
  const ruta = ["preguntas", "lista"] as const;

  if (!edicion) {
    return (
      <div className="mt-6 space-y-3">
        {lista.map((p, i) => (
          <details
            key={i}
            className="group rounded-2xl border-2 border-marino/15 bg-white transition open:border-naranja open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold text-marino [&::-webkit-details-marker]:hidden">
              {p.pregunta}
              <IconoFlecha className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 leading-relaxed whitespace-pre-line">{p.respuesta}</p>
          </details>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {lista.map((p, i) => (
        <div key={i} className="rounded-2xl border-2 border-naranja/60 bg-white px-5 py-4">
          <p className="font-semibold text-marino">
            <Texto ruta={[...ruta, i, "pregunta"]} valor={p.pregunta} etiqueta="Pregunta" />
          </p>
          <p className="mt-2 leading-relaxed whitespace-pre-line">
            <Texto ruta={[...ruta, i, "respuesta"]} valor={p.respuesta} etiqueta="Respuesta" multilinea />
          </p>
          <div data-editor-ui="" className="mt-3 flex flex-wrap gap-2 font-sans">
            <BotonesOrden edicion={edicion} ruta={ruta} lista={lista} indice={i} nombre="esta pregunta" />
          </div>
        </div>
      ))}
      {lista.length < MAX_PREGUNTAS && (
        <button
          type="button"
          data-editor-ui=""
          className={claseBotonAgregar}
          onClick={() =>
            edicion.actualizar(ruta, [...lista, { pregunta: "¿Nueva pregunta?", respuesta: "Escribí acá la respuesta." }])
          }
        >
          + Agregar pregunta
        </button>
      )}
    </div>
  );
}

const claseEnlaceRed =
  "flex items-center gap-2 rounded-full border-2 border-marino/20 bg-white px-5 py-3 font-semibold text-marino transition hover:-translate-y-0.5 hover:border-marino";

export function CampoAjuste({
  edicion,
  ruta,
  etiqueta,
  valor,
  ayuda,
  multilinea,
}: {
  edicion: Edicion;
  ruta: Ruta;
  etiqueta: string;
  valor: string;
  ayuda?: string;
  multilinea?: boolean;
}) {
  const id = `ajuste-${rutaATexto(ruta)}`;
  const error = edicion.error(ruta);
  const clase = `mt-1 w-full rounded-lg border-2 bg-white px-3 py-2 ${error ? "border-rojo" : "border-marino/20"}`;
  const props = {
    id,
    value: valor,
    "data-ruta": rutaATexto(ruta),
    "aria-invalid": error ? true : undefined,
    className: clase,
  };
  return (
    <div className="text-left">
      <label htmlFor={id} className="block text-sm font-medium text-marino">
        {etiqueta}
      </label>
      {multilinea ? (
        <textarea {...props} rows={3} onChange={(e) => edicion.actualizar(ruta, e.target.value)} />
      ) : (
        <input {...props} onChange={(e) => edicion.actualizar(ruta, e.target.value)} />
      )}
      {ayuda && !error && <p className="mt-1 text-xs text-texto/80">{ayuda}</p>}
      {error && <p className="mt-1 text-sm font-medium text-rojo">{error}</p>}
    </div>
  );
}

/** Enlaces de contacto (WhatsApp y redes). En el editor, formulario para cambiarlos. */
export function Redes({ contacto, whatsapp }: { contacto: Contenido["contacto"]; whatsapp: Contenido["whatsapp"] }) {
  const edicion = useEdicion();
  const enlaces = (
    <ul className="mt-10 flex flex-wrap justify-center gap-3">
      <li>
        <a href={urlWhatsapp(whatsapp)} target="_blank" rel="noopener noreferrer" className={claseEnlaceRed}>
          <IconoWhatsapp className="size-6" /> WhatsApp
        </a>
      </li>
      {contacto.redes.map((r, i) => (
        <li key={i}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${r.nombre}: ${r.usuario}`}
            className={claseEnlaceRed}
          >
            <IconoRed red={r.red} className="size-6" /> {r.nombre}
          </a>
        </li>
      ))}
    </ul>
  );
  if (!edicion) return enlaces;

  const ruta = ["contacto", "redes"] as const;
  return (
    <>
      {enlaces}
      <div data-editor-ui="" className="mt-8 space-y-4 rounded-3xl border-2 border-dashed border-marino/40 bg-white p-5 text-left font-sans">
        <h3 className="font-titulo text-xl font-semibold text-marino">WhatsApp y redes</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoAjuste
            edicion={edicion}
            ruta={["whatsapp", "numero"]}
            etiqueta="WhatsApp de la colonia"
            valor={whatsapp.numero}
            ayuda="Por ejemplo 11 2345-6789. Se usa en todos los botones de WhatsApp del sitio."
          />
          <CampoAjuste
            edicion={edicion}
            ruta={["whatsapp", "mensaje"]}
            etiqueta="Mensaje que aparece escrito al abrir el chat"
            valor={whatsapp.mensaje}
          />
        </div>
        {contacto.redes.map((r, i) => (
          <fieldset key={i} className="rounded-2xl border-2 border-marino/15 p-4">
            <legend className="px-1 text-sm font-semibold text-marino">Red {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`red-${i}`} className="block text-sm font-medium text-marino">
                  Red
                </label>
                <select
                  id={`red-${i}`}
                  value={r.red}
                  onChange={(e) => edicion.actualizar([...ruta, i, "red"], e.target.value)}
                  className="mt-1 w-full rounded-lg border-2 border-marino/20 bg-white px-3 py-2"
                >
                  {REDES.map((red) => (
                    <option key={red} value={red}>
                      {red[0].toUpperCase() + red.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <CampoAjuste edicion={edicion} ruta={[...ruta, i, "nombre"]} etiqueta="Texto del botón" valor={r.nombre} />
              <CampoAjuste edicion={edicion} ruta={[...ruta, i, "usuario"]} etiqueta="Usuario" valor={r.usuario} />
            </div>
            <div className="mt-3">
              <CampoAjuste edicion={edicion} ruta={[...ruta, i, "url"]} etiqueta="Enlace" valor={r.url} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <BotonesOrden edicion={edicion} ruta={ruta} lista={contacto.redes} indice={i} nombre="esta red" />
            </div>
          </fieldset>
        ))}
        {contacto.redes.length < MAX_REDES && (
          <button
            type="button"
            className={claseBotonAgregar}
            onClick={() =>
              edicion.actualizar(ruta, [
                ...contacto.redes,
                { red: "facebook", nombre: "Facebook", usuario: "", url: "https://www.facebook.com/" },
              ])
            }
          >
            + Agregar red
          </button>
        )}
      </div>
    </>
  );
}

/** Descripción para buscadores y al compartir el link (no se ve en la página). */
export function AjusteDescripcion({ descripcion }: { descripcion: string }) {
  const edicion = useEdicion();
  if (!edicion) return null;
  return (
    <div data-editor-ui="" className="mx-auto max-w-6xl px-4 pt-6 font-sans">
      <div className="rounded-3xl border-2 border-dashed border-marino/40 bg-white p-5">
        <CampoAjuste
          edicion={edicion}
          ruta={["descripcion"]}
          etiqueta="Descripción para Google y para cuando se comparte el link (no se ve en la página)"
          valor={descripcion}
          multilinea
        />
      </div>
    </div>
  );
}
