import { z } from "zod";
import { LARGO_MAXIMO, MAX_NINOS_POR_INSCRIPCION } from "@/config/inscripcion";
import { MENSAJE_DNI_INVALIDO, normalizarDni } from "@/lib/dominio/dni";
import { calcularEdad, validarFechaNacimiento, type RangoEdadPermitida } from "@/lib/dominio/edad";
import { fechaDesdeIso, fechaDesdeIsoONull } from "@/lib/dominio/fechas";
import { diasDeOpcion, horariosElegidos, type Opcion, type Precios } from "@/lib/dominio/opciones";
import { normalizarWhatsapp, separarTelefono, soloCodigoDePais } from "@/lib/dominio/telefono";

// El mismo esquema valida en el formulario (en vivo) y en la API.
// No importa nada de Prisma para poder usarse en el navegador.

export const MODALIDADES = ["SEMANAS", "POR_DIA"] as const;

/** Error de la casilla de aceptación (va aparte del schema: no es un dato de la inscripción). */
export const MENSAJE_FALTA_ACEPTAR = "Marcá esta casilla para poder enviar la inscripción.";

export interface ContextoInscripcion {
  /** Opciones de inscripción que se ofrecen (solo las activas). */
  opciones: Opcion[];
  /** SEMANAS = por opciones; POR_DIA = días sueltos. Si no se indica, solo por opciones. */
  modalidades?: readonly (typeof MODALIDADES)[number][];
  /** Precios para mostrar el total estimado (no se usan para validar). */
  precios?: Precios;
  /** Edad permitida en la temporada. Si no se indica, la de src/config/inscripcion.ts. */
  edades?: RangoEdadPermitida;
  /** Fecha de hoy (aaaa-mm-dd) en Argentina. */
  hoy: string;
}

const texto = (max: number, requerido: string) =>
  z
    .string()
    .trim()
    .min(1, requerido)
    .max(max, `Puede tener hasta ${max} caracteres.`);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Puede tener hasta ${max} caracteres.`)
    .optional()
    .transform((v) => v || undefined);

/** Mensaje de error de un teléfono escrito como "+código número" (o sin "+", y entonces es de Argentina). */
function errorTelefono(valor: string): string | null {
  if (valor.startsWith("+") && !separarTelefono(valor).codigo) return "Falta el código de país.";
  if (normalizarWhatsapp(valor)) return null;
  return separarTelefono(valor).codigo === "54" || !valor.startsWith("+")
    ? "No parece un celular válido. Revisá que tenga el código de área."
    : "No parece un celular válido para ese código de país.";
}

const whatsapp = z
  .string()
  .trim()
  .refine((v) => v !== "" && !soloCodigoDePais(v), "Ingresá un número de teléfono.")
  .transform((valor, ctx) => {
    const error = errorTelefono(valor);
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
      return z.NEVER;
    }
    return normalizarWhatsapp(valor) as string;
  });

const whatsappOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor, ctx) => {
    if (!valor || soloCodigoDePais(valor)) return undefined;
    const error = errorTelefono(valor);
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
      return z.NEVER;
    }
    return normalizarWhatsapp(valor) as string;
  });

const emailOpcional = z
  .string()
  .trim()
  .max(LARGO_MAXIMO.email, `Puede tener hasta ${LARGO_MAXIMO.email} caracteres.`)
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.email("Revisá el email.").optional());

export const contactoSchema = z.object({
  nombre: texto(LARGO_MAXIMO.nombre, "Ingresá el nombre."),
  apellido: texto(LARGO_MAXIMO.nombre, "Ingresá el apellido."),
  parentesco: z.string().trim().max(LARGO_MAXIMO.parentesco, `Puede tener hasta ${LARGO_MAXIMO.parentesco} caracteres.`).default(""),
  whatsapp,
  whatsappAlt: whatsappOpcional,
  email: emailOpcional,
});

const CAMPOS_ASISTENCIA = new Set(["modalidad", "semanas", "dias"]);

export function crearNinoSchema(contexto: ContextoInscripcion) {
  const hoy = fechaDesdeIso(contexto.hoy);
  const opciones = new Map(contexto.opciones.map((o) => [o.id, o]));
  const modalidades = contexto.modalidades ?? (["SEMANAS"] as const);

  return z
    .object({
      nombre: texto(LARGO_MAXIMO.nombre, "Ingresá el nombre."),
      apellido: texto(LARGO_MAXIMO.nombre, "Ingresá el apellido."),
      dni: z
        .string()
        .trim()
        .min(1, "Ingresá el DNI.")
        .transform((valor, ctx) => {
          const dni = normalizarDni(valor);
          if (!dni) {
            ctx.addIssue({ code: "custom", message: MENSAJE_DNI_INVALIDO });
            return z.NEVER;
          }
          return dni;
        }),
      fechaNacimiento: z
        .string()
        .min(1, "Ingresá la fecha de nacimiento.")
        .superRefine((valor, ctx) => {
          const fecha = fechaDesdeIsoONull(valor);
          const error = fecha ? validarFechaNacimiento(fecha, hoy, contexto.edades) : "Ingresá una fecha válida.";
          if (error) ctx.addIssue({ code: "custom", message: error });
        }),
      infoAdicional: textoOpcional(LARGO_MAXIMO.infoAdicional),
      modalidad: z
        .enum(MODALIDADES, "Elegí cómo va a asistir.")
        .refine((m) => modalidades.includes(m), "Esa forma de asistir no está disponible."),
      semanas: z.array(z.number().int()).default([]),
      dias: z.array(z.object({ fecha: z.string(), opcion: z.number().int() })).default([]),
    })
    .superRefine(
      (nino, ctx) => {
        const todas = contexto.opciones;
        if (nino.modalidad === "SEMANAS") {
          if (nino.semanas.length === 0) {
            ctx.addIssue({ code: "custom", path: ["semanas"], message: "Elegí al menos una opción." });
          } else if (nino.semanas.some((id) => !opciones.has(id))) {
            ctx.addIssue({ code: "custom", path: ["semanas"], message: "Alguna de las opciones elegidas no es válida." });
          } else if (horariosElegidos(todas, nino.semanas).length > 1) {
            ctx.addIssue({ code: "custom", path: ["semanas"], message: "Elegí opciones de un mismo horario." });
          }
        } else {
          const fueraDeFecha = (d: { fecha: string; opcion: number }) => {
            const opcion = opciones.get(d.opcion);
            return !opcion || !diasDeOpcion(opcion).includes(d.fecha);
          };
          if (nino.dias.length === 0) {
            ctx.addIssue({ code: "custom", path: ["dias"], message: "Elegí al menos un día." });
          } else if (nino.dias.some(fueraDeFecha)) {
            ctx.addIssue({
              code: "custom",
              path: ["dias"],
              message: "Solo se pueden elegir días de lunes a viernes dentro de las fechas de la colonia.",
            });
          } else if (horariosElegidos(todas, nino.dias.map((d) => d.opcion)).length > 1) {
            ctx.addIssue({ code: "custom", path: ["dias"], message: "Elegí días de un mismo horario." });
          }
        }
      },
      // Se valida la asistencia aunque otros campos del niño tengan errores,
      // así el formulario muestra todos los errores juntos.
      { when: (payload) => !payload.issues.some((i) => CAMPOS_ASISTENCIA.has(String(i.path?.[0]))) },
    )
    .transform((nino) => ({
      ...nino,
      // Solo se guarda la asistencia de la modalidad elegida, sin repetidos.
      semanas: nino.modalidad === "SEMANAS" ? [...new Set(nino.semanas)].sort((a, b) => a - b) : [],
      dias:
        nino.modalidad === "POR_DIA"
          ? [...new Map(nino.dias.map((d) => [d.fecha, d])).values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
          : [],
    }));
}

export function crearInscripcionSchema(contexto: ContextoInscripcion) {
  return z
    .object({
      contactos: z.array(contactoSchema).min(1, "Agregá al menos un contacto."),
      ninos: z
        .array(crearNinoSchema(contexto))
        .min(1, "Agregá al menos un niño o niña.")
        .max(MAX_NINOS_POR_INSCRIPCION, `Se pueden inscribir hasta ${MAX_NINOS_POR_INSCRIPCION} chicos por formulario.`),
    })
    .superRefine(
      (datos, ctx) => {
        if (!Array.isArray(datos.contactos)) return;
        const vistos = new Map<string, number>();
        datos.contactos.forEach((c, i) => {
          // Si otros campos fallaron, solo se comparan los WhatsApp que ya se normalizaron bien.
          if (typeof c?.whatsapp !== "string" || !c.whatsapp.startsWith("+")) return;
          const anterior = vistos.get(c.whatsapp);
          if (anterior !== undefined) {
            ctx.addIssue({
              code: "custom",
              path: ["contactos", i, "whatsapp"],
              message: `Este número ya está cargado en el contacto ${anterior + 1}.`,
            });
          } else {
            vistos.set(c.whatsapp, i);
          }
        });
      },
      { when: () => true },
    );
}

export type InscripcionEntrada = z.input<ReturnType<typeof crearInscripcionSchema>>;
export type InscripcionValidada = z.output<ReturnType<typeof crearInscripcionSchema>>;
export type ContactoValidado = InscripcionValidada["contactos"][number];
export type NinoValidado = InscripcionValidada["ninos"][number];

/** Edad que se muestra al lado de la fecha de nacimiento en el formulario (null si la fecha no es válida). */
export function edadParaMostrar(fechaNacimiento: string, hoy: string): number | null {
  const fecha = fechaDesdeIsoONull(fechaNacimiento);
  if (!fecha) return null;
  const edad = calcularEdad(fecha, fechaDesdeIso(hoy));
  return edad >= 0 ? edad : null;
}
