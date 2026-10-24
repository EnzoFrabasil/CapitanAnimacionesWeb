import "server-only";
import { calcularCupos, type Cupos } from "@/lib/dominio/cupos";
import { prisma } from "@/lib/prisma";

/**
 * Lugares de la temporada con la inscripción abierta. Cada niño inscripto ocupa
 * un lugar (en espera o confirmado; los cancelados lo liberan). Null si no hay
 * temporada abierta o no tiene cupo configurado.
 */
export async function cuposDisponibles(): Promise<Cupos | null> {
  const temporada = await prisma.temporada.findFirst({
    where: { inscripcionAbierta: true },
    orderBy: [{ anio: "desc" }, { createdAt: "desc" }],
    select: { id: true, cupo: true },
  });
  if (!temporada || temporada.cupo === null) return null;

  const ocupados = await prisma.inscripcionNino.count({
    where: { estado: { not: "CANCELADO" }, inscripcion: { temporadaId: temporada.id } },
  });
  return calcularCupos(temporada.cupo, ocupados);
}
