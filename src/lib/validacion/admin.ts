import { z } from "zod";
import { LARGO_MAXIMO } from "@/config/inscripcion";
import { normalizarDni } from "@/lib/dominio/dni";
import { fechaDesdeIsoONull } from "@/lib/dominio/fechas";
import { normalizarWhatsapp } from "@/lib/dominio/telefono";
import { MODALIDADES, TURNOS } from "./inscripcion";

// Validaciones de las ediciones del panel. Son más flexibles que las del
// formulario público (por ejemplo, no se exige el rango de edad).

export const ESTADOS = ["EN_ESPERA", "CONFIRMADO", "CANCELADO"] as const;

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
    ctx.addIssue({ code: "custom", message: "El DNI tiene que tener 7 u 8 números." });
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
    ctx.addIssue({ code: "custom", message: "El WhatsApp no es un celular argentino válido." });
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
      ctx.addIssue({ code: "custom", message: "El DNI tiene que tener 7 u 8 números." });
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
  turno: z.enum(TURNOS, "Turno inválido."),
  estado: z.enum(ESTADOS, "Estado inválido."),
  modalidad: z.enum(MODALIDADES, "Modalidad inválida."),
  semanas: z.array(z.coerce.number().int().positive()),
  dias: z.array(z.string()),
  notasAdmin: opcional(5000),
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

export const temporadaSchema = z.object({
  nombre: texto(80, "Falta el nombre."),
  anio: z.coerce.number("Año inválido.").int("Año inválido.").min(2000, "Año inválido.").max(2100, "Año inválido."),
});

export const semanaSchema = z
  .object({
    numero: z.coerce.number("Número inválido.").int("Número inválido.").min(1, "El número tiene que ser 1 o más."),
    fechaInicio: fechaSchema("Fecha de inicio inválida."),
    fechaFin: fechaSchema("Fecha de fin inválida."),
  })
  .refine((s) => s.fechaInicio <= s.fechaFin, { message: "La fecha de fin no puede ser anterior al inicio.", path: ["fechaFin"] });

/** Primer mensaje de cada error de Zod, para mostrar en el panel. */
export function mensajesDeError(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((i) => i.message))];
}
