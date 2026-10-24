"use client";

import Image, { type ImageProps } from "next/image";
import { urlMapa } from "@/lib/contenido/urls";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Piezas de la página de inicio que se pueden editar en el lugar desde el panel.
// Fuera del editor (en el sitio público) no hay contexto de edición y se
// muestran como texto e imágenes comunes.

export type Ruta = readonly (string | number)[];

export interface Edicion {
  actualizar: (ruta: Ruta, valor: unknown) => void;
  error: (ruta: Ruta) => string | undefined;
  /** Achica y sube una imagen; devuelve su URL o lanza un Error con un mensaje para mostrar. */
  subirImagen: (archivo: File) => Promise<string>;
}

const EdicionContexto = createContext<Edicion | null>(null);

export function ProveedorEdicion({ edicion, children }: { edicion: Edicion; children: ReactNode }) {
  return <EdicionContexto value={edicion}>{children}</EdicionContexto>;
}

export const useEdicion = () => useContext(EdicionContexto);

export const rutaATexto = (ruta: Ruta) => ruta.join(".");

/** Muestra su contenido solo dentro del editor. */
export function SoloEdicion({ children }: { children: ReactNode }) {
  return useEdicion() ? children : null;
}

/** Muestra su contenido solo en el sitio público. */
export function SoloPublico({ children }: { children: ReactNode }) {
  return useEdicion() ? null : children;
}

const sinSaltosFinales = (t: string) => t.replace(/\n+$/, "");

/**
 * Texto de la página. En el editor se edita haciendo clic sobre él.
 * `multilinea` permite Enter (párrafos); si no, Enter no hace nada.
 */
export function Texto({
  ruta,
  valor,
  multilinea = false,
  etiqueta,
}: {
  ruta: Ruta;
  valor: string;
  multilinea?: boolean;
  /** Nombre del campo para lectores de pantalla y para cuando está vacío. */
  etiqueta: string;
}) {
  const edicion = useEdicion();
  if (!edicion) return valor;
  return <TextoEditable edicion={edicion} ruta={ruta} valor={valor} multilinea={multilinea} etiqueta={etiqueta} />;
}

function TextoEditable({
  edicion,
  ruta,
  valor,
  multilinea,
  etiqueta,
}: {
  edicion: Edicion;
  ruta: Ruta;
  valor: string;
  multilinea: boolean;
  etiqueta: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // El elemento no es controlado por React (perdería la posición del cursor):
  // solo se pisa su texto cuando el valor cambia desde afuera (descartar, cargar versión).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && sinSaltosFinales(el.innerText) !== sinSaltosFinales(valor)) el.innerText = valor;
  }, [valor]);

  const error = edicion.error(ruta);
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={etiqueta}
      aria-multiline={multilinea}
      aria-invalid={error ? true : undefined}
      title={error ?? `Editar ${etiqueta.toLowerCase()}`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      data-editable=""
      data-ruta={rutaATexto(ruta)}
      data-vacio={etiqueta}
      data-error={error ? "" : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multilinea) e.preventDefault();
      }}
      onInput={(e) => {
        const texto = sinSaltosFinales(e.currentTarget.innerText);
        edicion.actualizar(ruta, multilinea ? texto : texto.replace(/\s*\n\s*/g, " "));
      }}
    />
  );
}

/** Las imágenes subidas desde el editor ya vienen achicadas: no pasan por el optimizador. */
export const esImagenSubida = (src: string) => src.startsWith("/imagenes/");

/**
 * Imagen de la página. En el editor muestra un botón para reemplazarla y un
 * campo para su descripción (texto alternativo).
 */
export function ImagenEditable({
  ruta,
  rutaAlt,
  src,
  alt,
  ...props
}: Omit<ImageProps, "src" | "alt"> & { ruta: Ruta; rutaAlt: Ruta; src: string; alt: string }) {
  const edicion = useEdicion();
  const imagen = <Image src={src} alt={alt} unoptimized={esImagenSubida(src)} {...props} />;
  if (!edicion) return imagen;
  return (
    <ImagenEnEdicion edicion={edicion} ruta={ruta} rutaAlt={rutaAlt} alt={alt}>
      {imagen}
    </ImagenEnEdicion>
  );
}

function ImagenEnEdicion({
  edicion,
  ruta,
  rutaAlt,
  alt,
  children,
}: {
  edicion: Edicion;
  ruta: Ruta;
  rutaAlt: Ruta;
  alt: string;
  children: ReactNode;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const idAlt = `alt-${rutaATexto(rutaAlt)}`;
  const errorImagen = errorSubida ?? edicion.error(ruta);
  const errorAlt = edicion.error(rutaAlt);

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      edicion.actualizar(ruta, await edicion.subirImagen(archivo));
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="relative" data-ruta={rutaATexto(ruta)}>
      <div className={subiendo ? "opacity-40" : ""}>{children}</div>
      <div data-editor-ui="" className="mt-3 space-y-2 text-left font-sans text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-marino px-4 py-2 font-semibold text-white shadow focus-within:outline-4 focus-within:outline-azul/40 hover:bg-marino/90">
          {subiendo ? "Subiendo…" : "Cambiar imagen"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={subiendo}
            onChange={(e) => {
              void elegir(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {errorImagen && (
          <p role="alert" className="font-medium text-rojo">
            {errorImagen}
          </p>
        )}
        <div>
          <label htmlFor={idAlt} className="block text-xs font-medium text-marino">
            Descripción de la imagen (la leen los lectores de pantalla y Google)
          </label>
          <input
            id={idAlt}
            data-ruta={rutaATexto(rutaAlt)}
            value={alt}
            onChange={(e) => edicion.actualizar(rutaAlt, e.target.value)}
            aria-invalid={errorAlt ? true : undefined}
            className={`mt-1 w-full rounded-lg border-2 bg-white px-3 py-1.5 ${errorAlt ? "border-rojo" : "border-marino/20"}`}
          />
          {errorAlt && <p className="mt-1 font-medium text-rojo">{errorAlt}</p>}
        </div>
      </div>
    </div>
  );
}

/** Mapa de Google. En el editor espera a que se termine de escribir la dirección para recargarlo. */
export function Mapa({ direccion }: { direccion: string }) {
  const edicion = useEdicion();
  const [mostrada, setMostrada] = useState(direccion);

  useEffect(() => {
    if (!edicion) return;
    const t = setTimeout(() => setMostrada(direccion), 800);
    return () => clearTimeout(t);
  }, [direccion, edicion]);

  const actual = edicion ? mostrada : direccion;
  return (
    <iframe
      title={`Mapa: ${actual}`}
      src={urlMapa(actual)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="h-72 w-full rounded-3xl border-0 md:col-span-3 md:h-80"
    />
  );
}
