import "server-only";
import { fechaAIso } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import type { ContextoInscripcion } from "@/lib/validacion/inscripcion";

export interface TemporadaAbierta {
  id: number;
  nombre: string;
  anio: number;
  /** Solo las semanas activas. */
  semanas: ContextoInscripcion["semanas"];
  turnos: NonNullable<ContextoInscripcion["turnos"]>;
  modalidades: NonNullable<ContextoInscripcion["modalidades"]>;
  grupos: { id: number; nombre: string; edadMin: number; edadMax: number }[];
}

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

  return {
    id: temporada.id,
    nombre: temporada.nombre,
    anio: temporada.anio,
    turnos: temporada.turnos,
    modalidades: [
      ...(temporada.permiteSemanas ? (["SEMANAS"] as const) : []),
      ...(temporada.permitePorDia ? (["POR_DIA"] as const) : []),
    ],
    semanas: temporada.semanas.map((s) => ({
      id: s.id,
      numero: s.numero,
      fechaInicio: fechaAIso(s.fechaInicio),
      fechaFin: fechaAIso(s.fechaFin),
    })),
    grupos: temporada.gruposEdad.map(({ id, nombre, edadMin, edadMax }) => ({ id, nombre, edadMin, edadMax })),
  };
}
