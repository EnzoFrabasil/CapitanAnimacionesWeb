import "server-only";
import { calcularAnaliticas, type Analiticas } from "@/lib/dominio/analiticas";
import { fechaAIso, hoyEnArgentina } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import { aOpcion, preciosDe } from "@/lib/temporada";
import type { TemporadaListado } from "./consultas";

/** Resumen de la temporada para el panel de analíticas. */
export async function analiticasDeTemporada(temporada: TemporadaListado): Promise<Analiticas> {
  const filas = await prisma.inscripcionNino.findMany({
    where: { inscripcion: { temporadaId: temporada.id } },
    select: {
      id: true,
      estado: true,
      modalidad: true,
      precioAcordado: true,
      grupoEdadId: true,
      semanas: { select: { semanaId: true } },
      dias: { select: { fecha: true, semanaId: true } },
      inscripcion: { select: { fechaAlta: true } },
      nino: { select: { familiaId: true, familia: { select: { descuentoHermanos: true } } } },
    },
  });

  return calcularAnaliticas({
    inscriptos: filas.map((f) => ({
      id: f.id,
      estado: f.estado,
      familiaId: f.nino.familiaId,
      modoDescuento: f.nino.familia.descuentoHermanos,
      grupoId: f.grupoEdadId,
      alta: fechaAIso(hoyEnArgentina(f.inscripcion.fechaAlta)),
      asistencia: {
        modalidad: f.modalidad,
        opciones: f.semanas.map((s) => s.semanaId),
        dias: f.dias.map((d) => ({ fecha: fechaAIso(d.fecha), opcion: d.semanaId })),
        precioAcordado: f.precioAcordado,
      },
    })),
    opciones: temporada.semanas.map(aOpcion),
    precios: preciosDe(temporada),
    grupos: temporada.gruposEdad.map((g) => ({ id: g.id, nombre: g.nombre })),
    cupo: temporada.cupo,
    hasta: fechaAIso(hoyEnArgentina()),
  });
}
