import { fechaAIso } from "@/lib/dominio/fechas";
import { precioCalculado, type Asistencia } from "@/lib/dominio/opciones";
import { prisma } from "@/lib/prisma";
import { INCLUIR_PAQUETES, aOpcion, preciosDe } from "@/lib/temporada";

// Precio congelado al confirmar: los que están en espera o contactados siguen los
// precios actuales; al pasar a Confirmado el precio queda fijo (solo cambia a mano,
// con el precio acordado). Si deja de estar confirmado, vuelve a calcularse.
// Lo usan la edición rápida, "Editar todos", la ficha y la importación de CSV.

type Cliente = Pick<typeof prisma, "inscripcionNino">;
type Estado = "EN_ESPERA" | "CONTACTADO" | "CONFIRMADO" | "CANCELADO";

/**
 * Qué guardar en precioConfirmado al cambiar el estado de un inscripto:
 * - pasa a Confirmado → el precio de ese momento (con la asistencia nueva si cambió);
 * - deja de estar Confirmado → se libera (null);
 * - en otro caso no se toca (undefined).
 */
export async function precioConfirmadoAlCambiar(
  db: Cliente,
  inscripcionNinoId: number,
  estadoNuevo: Estado,
  asistenciaNueva?: Pick<Asistencia, "modalidad" | "opciones" | "dias">,
): Promise<number | null | undefined> {
  const actual = await db.inscripcionNino.findUnique({
    where: { id: inscripcionNinoId },
    select: {
      estado: true,
      modalidad: true,
      semanas: { select: { semanaId: true } },
      dias: { select: { fecha: true, semanaId: true } },
      inscripcion: { select: { temporada: { include: { semanas: true, paquetes: INCLUIR_PAQUETES } } } },
    },
  });
  if (!actual) return undefined;
  const confirmado = actual.estado === "CONFIRMADO";
  if (estadoNuevo !== "CONFIRMADO") return confirmado ? null : undefined;
  if (confirmado) return undefined; // ya estaba confirmado: su precio no cambia
  const temporada = actual.inscripcion.temporada;
  const asistencia = asistenciaNueva ?? {
    modalidad: actual.modalidad,
    opciones: actual.semanas.map((s) => s.semanaId),
    dias: actual.dias.map((d) => ({ fecha: fechaAIso(d.fecha), opcion: d.semanaId })),
  };
  return precioCalculado(temporada.semanas.map(aOpcion), preciosDe(temporada), asistencia);
}
