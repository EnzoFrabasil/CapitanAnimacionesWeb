import "server-only";
import { lugaresLibres } from "@/lib/dominio/cupos";
import { fechaAIso } from "@/lib/dominio/fechas";
import type { Opcion, Precios } from "@/lib/dominio/opciones";
import { prisma } from "@/lib/prisma";
import type { ContextoInscripcion } from "@/lib/validacion/inscripcion";

export interface TemporadaAbierta {
  id: number;
  nombre: string;
  anio: number;
  /** Solo las opciones activas. */
  opciones: Opcion[];
  modalidades: NonNullable<ContextoInscripcion["modalidades"]>;
  edades: NonNullable<ContextoInscripcion["edades"]>;
  precios: Precios;
  /** PREINSCRIPCION: sin precios ni pago; INSCRIPCION: con totales y pedido de pago al final. */
  modo: "PREINSCRIPCION" | "INSCRIPCION";
  /** Lugares libres (null = la temporada no tiene cupo). */
  lugares: number | null;
  grupos: { id: number; nombre: string; edadMin: number; edadMax: number }[];
}

/** Opción de inscripción tal como la usa la aplicación (fechas en aaaa-mm-dd). */
export function aOpcion(s: {
  id: number;
  numero: number;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  horaInicio: string;
  horaFin: string;
  precio: number;
}): Opcion {
  return {
    id: s.id,
    numero: s.numero,
    nombre: s.nombre || `Opción ${s.numero}`,
    fechaInicio: fechaAIso(s.fechaInicio),
    fechaFin: fechaAIso(s.fechaFin),
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    precio: s.precio,
  };
}

/** Precios de una temporada. */
export const preciosDe = (t: { precioColoniaCompleta: number | null; precioDia: number | null; descuentoHermanos: number }): Precios => ({
  coloniaCompleta: t.precioColoniaCompleta,
  dia: t.precioDia,
  descuentoHermanos: t.descuentoHermanos,
});

/**
 * Temporada con la inscripción abierta (si hubiera más de una, la más reciente),
 * o null si las inscripciones están cerradas.
 */
export async function buscarTemporadaAbierta(): Promise<TemporadaAbierta | null> {
  const temporada = await prisma.temporada.findFirst({
    where: { inscripcionAbierta: true },
    orderBy: [{ anio: "desc" }, { createdAt: "desc" }],
    include: {
      semanas: { where: { activa: true }, orderBy: { numero: "asc" } },
      gruposEdad: { orderBy: { edadMin: "asc" } },
    },
  });
  if (!temporada) return null;
  const ocupados =
    temporada.cupo === null
      ? 0
      : await prisma.inscripcionNino.count({
          where: { estado: { not: "CANCELADO" }, inscripcion: { temporadaId: temporada.id } },
        });

  return {
    id: temporada.id,
    nombre: temporada.nombre,
    anio: temporada.anio,
    edades: { minima: temporada.edadMinima, maxima: temporada.edadMaxima },
    modalidades: temporada.permitePorDia ? ["SEMANAS", "POR_DIA"] : ["SEMANAS"],
    precios: preciosDe(temporada),
    modo: temporada.modoInscripcion,
    lugares: lugaresLibres(temporada.cupo, ocupados),
    opciones: temporada.semanas.map(aOpcion),
    grupos: temporada.gruposEdad.map(({ id, nombre, edadMin, edadMax }) => ({ id, nombre, edadMin, edadMax })),
  };
}
