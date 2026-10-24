"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ProveedorEdicion, rutaATexto, type Edicion, type Ruta } from "@/components/inicio/editables";
import { VistaInicio } from "@/components/inicio/VistaInicio";
import { validarContenido, type Contenido } from "@/lib/contenido/esquema";
import { TAMANO_MAXIMO_IMAGEN } from "@/lib/contenido/imagenes";
import { formatearFechaHora, formatearWhatsapp } from "@/lib/formato";
import { publicarContenido } from "./acciones";

// Editor de la página de inicio: muestra la página real con los textos e
// imágenes editables en el lugar. "Publicar" valida todo y, si no hay errores,
// reemplaza la página del sitio.

interface VersionResumen {
  id: number;
  creadoEn: Date;
  contenido: Contenido;
}

/** El WhatsApp se guarda como dígitos (5491123456789); para editarlo se muestra legible. */
const paraEditar = (c: Contenido): Contenido => ({
  ...c,
  whatsapp: { ...c.whatsapp, numero: formatearWhatsapp(`+${c.whatsapp.numero}`) },
});

function conValor<T>(objeto: T, ruta: Ruta, valor: unknown): T {
  if (ruta.length === 0) return valor as T;
  const [clave, ...resto] = ruta;
  const copia = (Array.isArray(objeto) ? [...objeto] : { ...objeto }) as Record<string | number, unknown>;
  copia[clave] = conValor(copia[clave], resto, valor);
  return copia as T;
}

const LADO_MAXIMO = 1600;

/** Achica la imagen en el navegador (lado mayor 1600 px, WebP) para que la página cargue rápido. */
async function achicarImagen(archivo: File): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) {
    throw new Error("Elegí una imagen JPG, PNG o WebP.");
  }
  let mapa: ImageBitmap;
  try {
    mapa = await createImageBitmap(archivo);
  } catch {
    throw new Error("No se pudo leer la imagen. Probá con otra.");
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);
  lienzo.getContext("2d")?.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
  mapa.close();

  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", 0.85));
  const resultado = blob && blob.size < archivo.size ? blob : archivo;
  if (resultado.size > TAMANO_MAXIMO_IMAGEN) throw new Error("La imagen es demasiado pesada (máximo 3 MB).");
  return resultado;
}

async function subirImagen(archivo: File): Promise<string> {
  const datos = new FormData();
  datos.append("imagen", await achicarImagen(archivo));
  let cuerpo: { ok?: boolean; url?: string; error?: string } | null = null;
  try {
    const respuesta = await fetch("/api/admin/imagenes", { method: "POST", body: datos });
    cuerpo = await respuesta.json().catch(() => null);
  } catch {
    throw new Error("No hay conexión. Revisá internet y probá de nuevo.");
  }
  if (!cuerpo?.ok || !cuerpo.url) throw new Error(cuerpo?.error ?? "No se pudo subir la imagen.");
  return cuerpo.url;
}

const claseBoton =
  "rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export function EditorInicio({
  publicado,
  versionPublicada,
  versiones,
}: {
  publicado: Contenido;
  versionPublicada: number | null;
  versiones: VersionResumen[];
}) {
  const [base, setBase] = useState(() => ({ contenido: paraEditar(publicado), version: versionPublicada }));
  const [borrador, setBorrador] = useState(base.contenido);
  const [erroresServidor, setErroresServidor] = useState<{ ruta: string; mensaje: string }[]>([]);
  const [intentoPublicar, setIntentoPublicar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [verVersiones, setVerVersiones] = useState(false);
  const [publicando, iniciarPublicacion] = useTransition();
  const router = useRouter();

  const hayCambios = useMemo(() => JSON.stringify(borrador) !== JSON.stringify(base.contenido), [borrador, base]);
  const validacion = useMemo(() => validarContenido(borrador), [borrador]);
  const errores = validacion.ok ? erroresServidor : validacion.errores;
  const errorPorRuta = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of errores) if (!mapa.has(e.ruta)) mapa.set(e.ruta, e.mensaje);
    return mapa;
  }, [errores]);

  // Avisar antes de salir con cambios sin publicar.
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayCambios]);

  const edicion = useMemo<Edicion>(
    () => ({
      actualizar: (ruta, valor) => {
        setBorrador((b) => conValor(b, ruta, valor));
        setErroresServidor([]);
        setAviso(null);
      },
      error: (ruta) => errorPorRuta.get(rutaATexto(ruta)),
      subirImagen,
    }),
    [errorPorRuta],
  );

  const irAlError = (ruta: string) => {
    const el =
      document.querySelector<HTMLElement>(`[data-ruta="${CSS.escape(ruta)}"]`) ??
      document.querySelector<HTMLElement>(`[data-ruta^="${CSS.escape(ruta)}."]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  };

  const publicar = (forzar = false) => {
    setIntentoPublicar(true);
    setAviso(null);
    if (!validacion.ok) {
      irAlError(validacion.errores[0].ruta);
      return;
    }
    iniciarPublicacion(async () => {
      const r = await publicarContenido(borrador, base.version, forzar);
      if (r.ok) {
        const nuevo = paraEditar(r.contenido);
        setBase({ contenido: nuevo, version: r.version });
        setBorrador(nuevo);
        setIntentoPublicar(false);
        setAviso({ tipo: "ok", texto: "¡Listo! Los cambios ya están publicados en el sitio." });
        router.refresh(); // actualiza la lista de versiones
      } else if ("conflicto" in r) {
        if (
          window.confirm(
            "Otra persona publicó cambios en la página mientras editabas. ¿Publicar igual tu versión? (Reemplaza lo que publicó la otra persona.)",
          )
        ) {
          publicar(true);
        }
      } else {
        setErroresServidor(r.errores);
        setAviso({ tipo: "error", texto: "No se publicó: revisá lo marcado en rojo." });
      }
    });
  };

  const descartar = () => {
    if (window.confirm("¿Descartar todos los cambios sin publicar?")) {
      setBorrador(base.contenido);
      setErroresServidor([]);
      setIntentoPublicar(false);
      setAviso(null);
    }
  };

  const cargarVersion = (v: VersionResumen) => {
    if (hayCambios && !window.confirm("Vas a perder los cambios sin publicar. ¿Seguir?")) return;
    setBorrador(paraEditar(v.contenido));
    setVerVersiones(false);
    setAviso({
      tipo: "ok",
      texto: `Cargaste la versión del ${formatearFechaHora(v.creadoEn)}. Revisala y apretá "Publicar" para volver a ponerla en el sitio.`,
    });
  };

  const mostrarErrores = (intentoPublicar || erroresServidor.length > 0) && errores.length > 0;

  return (
    <div className="-mx-4 -mt-6">
      {/* Barra del editor */}
      <div data-editor-ui="" className="sticky top-0 z-50 border-b-4 border-naranja bg-white px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="font-titulo text-2xl font-bold text-marino">Editar página de inicio</h1>
            <p className="text-sm" aria-live="polite">
              {hayCambios
                ? "Tenés cambios sin publicar. Hacé clic en cualquier texto para editarlo."
                : "Esto es lo que se ve en el sitio. Hacé clic en cualquier texto para editarlo."}
            </p>
          </div>
          <a href="/" target="_blank" rel="noopener" className={`${claseBoton} text-marino underline underline-offset-4`}>
            Ver sitio
          </a>
          <button type="button" className={`${claseBoton} border-2 border-marino/20 text-marino`} onClick={() => setVerVersiones((v) => !v)}>
            Versiones anteriores
          </button>
          <button
            type="button"
            className={`${claseBoton} border-2 border-marino/20 text-marino`}
            onClick={descartar}
            disabled={!hayCambios || publicando}
          >
            Descartar cambios
          </button>
          <button
            type="button"
            className={`${claseBoton} bg-naranja px-6 font-titulo text-base text-white shadow`}
            onClick={() => publicar()}
            disabled={!hayCambios || publicando}
          >
            {publicando ? "Publicando…" : "Publicar cambios"}
          </button>
        </div>

        {aviso && (
          <p
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={`mx-auto mt-3 max-w-7xl rounded-xl px-4 py-2 text-sm font-medium ${
              aviso.tipo === "ok" ? "bg-verde/15 text-marino" : "bg-rojo/10 text-rojo"
            }`}
          >
            {aviso.texto}
            {aviso.tipo === "ok" && !hayCambios && (
              <>
                {" "}
                <a href="/" target="_blank" rel="noopener" className="underline">
                  Ver el sitio
                </a>
              </>
            )}
          </p>
        )}

        {mostrarErrores && (
          <div role="alert" className="mx-auto mt-3 max-w-7xl rounded-xl border-2 border-rojo bg-white px-4 py-3 text-sm">
            <p className="font-semibold text-rojo">
              No se puede publicar todavía: {errores.length === 1 ? "hay 1 cosa" : `hay ${errores.length} cosas`} para
              corregir.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {errores.slice(0, 8).map((e, i) => (
                <li key={i}>
                  {e.ruta ? (
                    <button type="button" className="text-left underline underline-offset-2" onClick={() => irAlError(e.ruta)}>
                      {e.mensaje}
                    </button>
                  ) : (
                    e.mensaje
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {verVersiones && (
          <div className="mx-auto mt-3 max-w-7xl rounded-xl border-2 border-marino/15 bg-white px-4 py-3 text-sm">
            <p className="font-semibold text-marino">Versiones publicadas (se guardan las últimas {versiones.length || 20})</p>
            {versiones.length === 0 ? (
              <p className="mt-1">Todavía no se publicó ninguna versión desde el panel.</p>
            ) : (
              <ul className="mt-2 divide-y divide-marino/10">
                {versiones.map((v, i) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {formatearFechaHora(v.creadoEn)}
                      {i === 0 && <span className="ml-2 rounded-full bg-verde/15 px-2 py-0.5 text-xs">En el sitio</span>}
                    </span>
                    <button type="button" className="font-semibold text-marino underline" onClick={() => cargarVersion(v)}>
                      Cargar en el editor
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Copia real de la página. Los enlaces no navegan mientras se edita. */}
      <div
        className="flex flex-col bg-crema"
        onClickCapture={(e) => {
          const objetivo = e.target as Element;
          if (objetivo.closest("a") && !objetivo.closest("[data-editor-ui]")) e.preventDefault();
        }}
      >
        <ProveedorEdicion edicion={edicion}>
          <VistaInicio contenido={borrador} />
        </ProveedorEdicion>
      </div>
    </div>
  );
}
