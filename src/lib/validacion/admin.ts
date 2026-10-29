import { z } from "zod";
import { EDAD_MAXIMA, EDAD_MINIMA, LARGO_MAXIMO } from "@/config/inscripcion";
import { MENSAJE_DNI_INVALIDO, normalizarDni } from "@/lib/dominio/dni";
import { fechaDesdeIsoONull } from "@/lib/dominio/fechas";
import { normalizarWhatsapp } from "@/lib/dominio/telefono";
import { HORA_VALIDA } from "@/lib/dominio/opciones";
import { MODALIDADES } from "./inscripcion";

// Validaciones de las ediciones del panel. Son más flexibles que las del
// formulario público (por ejemplo, no se exige el rango de edad).

/** En orden: en espera → contactado (se le escribió) → confirmado (pagó); o cancelado. */
export const ESTADOS = ["EN_ESPERA", "CONTACTADO", "CONFIRMADO", "CANCELADO"] as const;

const texto = (max: number, requerido: string) => z.string().trim().min(1, requerido).max(max, `Hasta ${max} caracteres.`);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Hasta ${max} caracteres.`)
    .optional()
    .transform((v) => v || null);

export const dniSchema = z.string().transform((v, ctx) => {
  const dni = normalizarDni(v);
  if (!dni) {
    ctx.addIssue({ code: "custom", message: MENSAJE_DNI_INVALIDO });
    return z.NEVER;
  }
  return dni;
});

export const fechaSchema = (mensaje = "Fecha inválida.") =>
  z.string().transform((v, ctx) => {
    const fecha = fechaDesdeIsoONull(v);
    if (!fecha) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return fecha;
  });

const whatsapp = z.string().transform((v, ctx) => {
  const n = normalizarWhatsapp(v);
  if (!n) {
    ctx.addIssue({ code: "custom", message: "El WhatsApp no es un celular válido. Revisá el código de país y el código de área." });
    return z.NEVER;
  }
  return n;
});

const whatsappOpcional = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const n = normalizarWhatsapp(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "El WhatsApp alternativo no es válido." });
      return z.NEVER;
    }
    return n;
  });

const emailOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .pipe(z.email("Email inválido.").max(LARGO_MAXIMO.email).nullable());

const dniOpcional = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const dni = normalizarDni(v);
    if (!dni) {
      ctx.addIssue({ code: "custom", message: MENSAJE_DNI_INVALIDO });
      return z.NEVER;
    }
    return dni;
  });

export const ninoAdminSchema = z.object({
  nombre: texto(LARGO_MAXIMO.nombre, "Falta el nombre."),
  apellido: texto(LARGO_MAXIMO.nombre, "Falta el apellido."),
  dni: dniSchema,
  fechaNacimiento: fechaSchema("Fecha de nacimiento inválida."),
  infoAdicional: opcional(LARGO_MAXIMO.infoAdicional),
});

export const inscripcionAdminSchema = z.object({
  grupoEdadId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  estado: z.enum(ESTADOS, "Estado inválido."),
  modalidad: z.enum(MODALIDADES, "Modalidad inválida."),
  semanas: z.array(z.coerce.number().int().positive()),
  dias: z.array(z.string()),
  notasAdmin: opcional(5000),
  // Vacío = se usa el precio calculado con los de la temporada.
  precioAcordado: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .number("Precio acordado inválido.")
      .int("El precio acordado tiene que ser un número entero, sin centavos.")
      .min(0, "El precio acordado no puede ser negativo.")
      .max(100_000_000, "Precio acordado inválido.")
      .nullable()
      .default(null),
  ),
  posibleDuplicado: z.boolean(),
});

export const responsableAdminSchema = z.object({
  nombre: texto(LARGO_MAXIMO.nombre, "Falta el nombre."),
  apellido: texto(LARGO_MAXIMO.nombre, "Falta el apellido."),
  whatsapp,
  whatsappAlt: whatsappOpcional,
  email: emailOpcional,
  dni: dniOpcional,
  parentesco: z.string().trim().max(LARGO_MAXIMO.parentesco, `Hasta ${LARGO_MAXIMO.parentesco} caracteres.`).default(""),
});

const edadTemporada = (nombre: string, porDefecto: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number(`${nombre} inválida.`)
      .int(`${nombre}: tiene que ser un número entero.`)
      .min(0, `${nombre} inválida.`)
      .max(25, `${nombre} inválida.`)
      .default(porDefecto),
  );

// La temporada se edita por partes (cada una en su sección del panel).

/** Nombre y año (La colonia → Temporadas). */
export const datosTemporadaSchema = z.object({
  nombre: texto(80, "Falta el nombre."),
  anio: z.coerce.number("Año inválido.").int("Año inválido.").min(2000, "Año inválido.").max(2100, "Año inválido."),
});

/** Cupo (La colonia → Precios y cupo). Vacío = sin cupo. */
export const cupoTemporadaSchema = z.object({
  cupo: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .number("Cupo inválido.")
      .int("El cupo tiene que ser un número entero.")
      .min(1, "El cupo tiene que ser 1 o más.")
      .max(10000, "Cupo inválido.")
      .nullable()
      .default(null),
  ),
});

/** Edades permitidas (La colonia → Grupos y edades). */
export const edadesTemporadaSchema = z
  .object({
    edadMinima: edadTemporada("Edad mínima", EDAD_MINIMA),
    edadMaxima: edadTemporada("Edad máxima", EDAD_MAXIMA),
  })
  .refine((t) => t.edadMinima <= t.edadMaxima, {
    message: "La edad mínima no puede ser mayor que la máxima.",
    path: ["edadMaxima"],
  });

// Casillas: el navegador manda "on" si están marcadas y nada si no.
const casilla = z.preprocess((v) => v === "on", z.boolean());

export const pesos = (nombre: string) =>
  z.coerce
    .number(`${nombre} inválido.`)
    .int(`${nombre}: sin centavos.`)
    .min(0, `${nombre} no puede ser negativo.`)
    .max(100_000_000, `${nombre} inválido.`);

// Vacío = sin precio definido.
const pesosOpcional = (nombre: string) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), pesos(nombre).nullable().default(null));

const hora = (mensaje: string) => z.string().trim().regex(HORA_VALIDA, mensaje);

/** Una opción de inscripción (se guarda en la tabla Semana). */
export const semanaSchema = z
  .object({
    numero: z.coerce.number("Orden inválido.").int("Orden inválido.").min(1, "El orden tiene que ser 1 o más."),
    nombre: texto(40, "Falta el nombre de la opción."),
    activa: casilla,
    fechaInicio: fechaSchema("Fecha de inicio inválida."),
    fechaFin: fechaSchema("Fecha de fin inválida."),
    horaInicio: hora("Hora de inicio inválida."),
    horaFin: hora("Hora de fin inválida."),
    precio: pesos("Precio"),
  })
  .refine((s) => s.fechaInicio <= s.fechaFin, { message: "La fecha de fin no puede ser anterior al inicio.", path: ["fechaFin"] })
  .refine((s) => s.horaInicio < s.horaFin, { message: "La hora de fin tiene que ser posterior a la de inicio.", path: ["horaFin"] });

/** Precios generales, descuento por hermanos y días sueltos de la temporada. */
export const preciosTemporadaSchema = z.object({
  precioDia: pesosOpcional("Precio por día"),
  descuentoHermanos: z.coerce
    .number("Descuento inválido.")
    .int("El descuento tiene que ser un número entero.")
    .min(0, "El descuento no puede ser negativo.")
    .max(100, "El descuento no puede pasar de 100%."),
  permitePorDia: casilla,
});

/** Primer mensaje de cada error de Zod, para mostrar en el panel. */
export function mensajesDeError(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((i) => i.message))];
}

/** Edición rápida desde el listado de inscriptos (sin asistencia ni datos secundarios). */
export const edicionRapidaSchema = z.object({
  nino: ninoAdminSchema.pick({ nombre: true, apellido: true, dni: true }),
  grupoEdadId: inscripcionAdminSchema.shape.grupoEdadId,
  estado: inscripcionAdminSchema.shape.estado,
  contacto: responsableAdminSchema.pick({ nombre: true, apellido: true, whatsapp: true }).nullable(),
});
export type EdicionRapida = z.input<typeof edicionRapidaSchema>;
