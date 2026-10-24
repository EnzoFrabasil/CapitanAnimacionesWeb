import { z } from "zod";
import { textosInscripcionIniciales } from "@/config/textosInscripcion";
import { normalizarWhatsapp } from "@/lib/dominio/telefono";

// Contenido de la página de inicio que los administradores editan desde el panel.
// Este esquema se usa al publicar (servidor) y para marcar errores en el editor.

export const COLORES_ACENTO = ["naranja", "azul", "verde", "violeta", "amarillo", "petroleo", "rojo"] as const;
export type ColorAcento = (typeof COLORES_ACENTO)[number];

export const REDES = ["instagram", "facebook", "tiktok"] as const;

export const MAX_SECCIONES = 10;
export const MAX_PREGUNTAS = 30;
export const MAX_REDES = 6;

const texto = (max: number, nombre: string) =>
  z
    .string()
    .trim()
    .min(1, `Completá ${nombre}.`)
    .max(max, `${nombre[0].toUpperCase()}${nombre.slice(1)} puede tener hasta ${max} caracteres.`);

const textoOpcional = (max: number, nombre: string) =>
  z.string().trim().max(max, `${nombre[0].toUpperCase()}${nombre.slice(1)} puede tener hasta ${max} caracteres.`);

/** Imágenes propias de la marca (/marca/...) o subidas desde el editor (/imagenes/<id>). */
const imagen = z
  .string()
  .regex(/^(\/marca\/[\w-]+\.(png|jpe?g|webp)|\/imagenes\/[a-z0-9]{10,40})$/, "Elegí una imagen válida.");

const urlRed = z
  .string()
  .trim()
  .min(1, "Completá el enlace.")
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "El enlace tiene que empezar con https://");

export const seccionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  titulo: texto(80, "el título"),
  texto: texto(1500, "el texto"),
  imagen,
  alt: texto(150, "la descripción de la imagen"),
  acento: z.enum(COLORES_ACENTO),
});

/** Textos del formulario de inscripción (no son de la página de inicio, pero se editan en el mismo lugar). */
export const textosInscripcionSchema = z.object({
  titulo: texto(80, "el título"),
  pasoContactos: texto(30, "el nombre del paso 1"),
  pasoNinos: texto(30, "el nombre del paso 2"),
  pasoRevision: texto(30, "el nombre del paso 3"),
  introContactos: textoOpcional(400, "la introducción del paso 1"),
  introNinos: textoOpcional(400, "la introducción del paso 2"),
  ayudaInfoAdicional: textoOpcional(200, "la ayuda de información adicional"),
  introRevision: textoOpcional(400, "la introducción del paso 3"),
  textoAceptacion: texto(300, "el texto de aceptación"),
  botonEnviar: texto(40, "el texto del botón"),
  exitoTitulo: texto(80, "el título"),
  exitoTexto: textoOpcional(600, "el texto"),
  cerradasTitulo: texto(80, "el título"),
  cerradasTexto: textoOpcional(400, "el texto"),
});
export type TextosInscripcion = z.output<typeof textosInscripcionSchema>;

export const contenidoSchema = z.object({
  descripcion: texto(300, "la descripción para Google y redes"),
  whatsapp: z.object({
    numero: z.string().transform((v, ctx) => {
      const e164 = normalizarWhatsapp(v);
      if (!e164) {
        ctx.addIssue({ code: "custom", message: "Ingresá un celular válido, con código de área (y +código de país si corresponde)." });
        return z.NEVER;
      }
      return e164.replace("+", "");
    }),
    mensaje: texto(200, "el mensaje de WhatsApp"),
  }),
  inicio: z.object({
    etiqueta: texto(60, "la etiqueta"),
    titulo: texto(100, "el título"),
    subtitulo: texto(400, "el subtítulo"),
    textoBoton: texto(30, "el texto del botón"),
    notaBoton: textoOpcional(150, "la nota del botón"),
    imagen,
    alt: texto(150, "la descripción de la imagen"),
  }),
  secciones: z.array(seccionSchema).max(MAX_SECCIONES, `Puede haber hasta ${MAX_SECCIONES} secciones.`),
  ubicacion: z.object({
    tituloSeccion: texto(80, "el título de la sección"),
    titulo: texto(100, "el nombre del lugar"),
    direccion: texto(200, "la dirección"),
    detalle: textoOpcional(600, "el detalle"),
  }),
  preguntas: z.object({
    tituloSeccion: texto(80, "el título de la sección"),
    lista: z
      .array(z.object({ pregunta: texto(200, "la pregunta"), respuesta: texto(1500, "la respuesta") }))
      .max(MAX_PREGUNTAS, `Puede haber hasta ${MAX_PREGUNTAS} preguntas.`),
  }),
  contacto: z.object({
    titulo: texto(80, "el título"),
    texto: textoOpcional(400, "el texto"),
    redes: z
      .array(
        z.object({
          red: z.enum(REDES),
          nombre: texto(30, "el nombre de la red"),
          usuario: texto(60, "el usuario"),
          url: urlRed,
        }),
      )
      .max(MAX_REDES, `Puede haber hasta ${MAX_REDES} redes.`),
  }),
  // Las versiones publicadas antes de que existieran estos textos usan los iniciales.
  inscripcion: textosInscripcionSchema.default(textosInscripcionIniciales),
});

/** Contenido tal como lo edita el panel (antes de normalizar el WhatsApp). */
export type ContenidoEntrada = z.input<typeof contenidoSchema>;
/** Contenido validado, listo para mostrar en el sitio. */
export type Contenido = z.output<typeof contenidoSchema>;
export type Seccion = Contenido["secciones"][number];

export interface ErrorContenido {
  /** Ruta del campo, por ejemplo "secciones.1.titulo". */
  ruta: string;
  mensaje: string;
}

/** Valida el contenido. Devuelve los errores con la ruta de cada campo para marcarlos en el editor. */
export function validarContenido(
  datos: unknown,
): { ok: true; contenido: Contenido } | { ok: false; errores: ErrorContenido[] } {
  const r = contenidoSchema.safeParse(datos);
  if (r.success) {
    const ids = r.data.secciones.map((s) => s.id);
    if (new Set(ids).size === ids.length) return { ok: true, contenido: r.data };
    return { ok: false, errores: [{ ruta: "secciones", mensaje: "Hay secciones repetidas. Recargá la página." }] };
  }
  return {
    ok: false,
    errores: r.error.issues.map((i) => ({ ruta: i.path.join("."), mensaje: i.message })),
  };
}

/** Id para una sección nueva (se usa como ancla en la página, por ejemplo #seccion-k3x9a). */
export function idSeccionNueva(): string {
  return `seccion-${Math.random().toString(36).slice(2, 8)}`;
}
