import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ESTADOS } from "@/lib/validacion/admin";
import { TURNOS } from "@/lib/validacion/inscripcion";

// Filtros del listado del panel (vienen de la URL). Los mismos filtros se usan
// para exportar el CSV. Un valor inválido se ignora en lugar de dar error.

const entero = z.coerce.number().int().positive();

export const filtrosSchema = z.object({
  temporada: entero.optional().catch(undefined),
  grupo: z.union([z.literal("sin"), entero]).optional().catch(undefined),
  turno: z.enum(TURNOS).optional().catch(undefined),
  semana: entero.optional().catch(undefined),
  estado: z.enum(ESTADOS).optional().catch(undefined),
  duplicados: z.literal("1").optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined).transform((v) => v || undefined),
});

export type Filtros = z.output<typeof filtrosSchema>;

/** Lee los filtros desde searchParams (un valor repetido toma el primero). */
export function leerFiltros(params: Record<string, string | string[] | undefined>): Filtros {
  const plano = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return filtrosSchema.parse(plano);
}

/** Convierte los filtros en query string (para links y para el CSV). */
export function filtrosAQuery(filtros: Filtros): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") params.set(clave, String(valor));
  }
  return params.toString();
}

/**
 * Condición de Prisma para el listado de una temporada.
 * `semana` necesita sus fechas para incluir también a los que van por día esa semana.
 */
export function condicionDeFiltros(
  filtros: Filtros,
  temporadaId: number,
  semana?: { id: number; fechaInicio: Date; fechaFin: Date } | null,
): Prisma.InscripcionNinoWhereInput {
  const y: Prisma.InscripcionNinoWhereInput[] = [{ inscripcion: { temporadaId } }];

  if (filtros.grupo === "sin") y.push({ grupoEdadId: null });
  else if (filtros.grupo !== undefined) y.push({ grupoEdadId: filtros.grupo });
  if (filtros.turno) y.push({ turno: filtros.turno });
  if (filtros.estado) y.push({ estado: filtros.estado });
  if (filtros.duplicados) y.push({ posibleDuplicado: true });

  if (filtros.semana !== undefined) {
    y.push(
      semana
        ? {
            OR: [
              { semanas: { some: { semanaId: semana.id } } },
              { dias: { some: { fecha: { gte: semana.fechaInicio, lte: semana.fechaFin } } } },
            ],
          }
        : { id: -1 }, // semana inexistente: sin resultados
    );
  }

  // Cada palabra tiene que aparecer en el nombre, el apellido o el DNI.
  for (const palabra of filtros.q?.split(/\s+/) ?? []) {
    const digitos = palabra.replace(/[.\s]/g, "");
    const o: Prisma.InscripcionNinoWhereInput[] = [
      { nino: { nombre: { contains: palabra, mode: "insensitive" } } },
      { nino: { apellido: { contains: palabra, mode: "insensitive" } } },
    ];
    if (/^\d+$/.test(digitos)) o.push({ nino: { dni: { contains: digitos } } });
    y.push({ OR: o });
  }

  return { AND: y };
}

/** Orden de la lista de espera: por fecha de alta y, a igual fecha, por orden de carga. */
export const ORDEN_LISTA_ESPERA: Prisma.InscripcionNinoOrderByWithRelationInput[] = [
  { inscripcion: { fechaAlta: "asc" } },
  { id: "asc" },
];
