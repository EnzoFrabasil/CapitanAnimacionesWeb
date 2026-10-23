import "server-only";
import {
  leerArchivo,
  planificarImportacion,
  referenciasDelArchivo,
  type EstadoActual,
  type PlanImportacion,
} from "@/lib/csv/inscriptos";
import { fechaAIso, fechaDesdeIso, hoyEnArgentina } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";

/** Lee el CSV, busca en la base los registros que menciona y arma el plan (sin modificar nada). */
export async function planificarDesdeTexto(texto: string): Promise<PlanImportacion> {
  const archivo = leerArchivo(texto);
  const { ids, whatsapps } = referenciasDelArchivo(archivo);

  const [filas, responsables] = await Promise.all([
    prisma.inscripcionNino.findMany({
      where: { id: { in: ids } },
      include: {
        inscripcion: { select: { temporadaId: true } },
        nino: {
          include: {
            // Mismo criterio que el listado y el export: el principal (o el primero).
            responsables: {
              orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
              take: 1,
              include: { responsable: { include: { _count: { select: { ninos: true } } } } },
            },
          },
        },
      },
    }),
    prisma.responsable.findMany({ where: { whatsapp: { in: whatsapps } }, select: { id: true, whatsapp: true } }),
  ]);

  const temporadaIds = [...new Set(filas.map((f) => f.inscripcion.temporadaId))];
  const grupos = await prisma.grupoEdad.findMany({
    where: { temporadaId: { in: temporadaIds } },
    select: { id: true, nombre: true, temporadaId: true },
  });

  const actuales = new Map<number, EstadoActual>(
    filas.map((f) => {
      const vinculo = f.nino.responsables[0];
      return [
        f.id,
        {
          id: f.id,
          ninoId: f.ninoId,
          temporadaId: f.inscripcion.temporadaId,
          estado: f.estado,
          turno: f.turno,
          grupoEdadId: f.grupoEdadId,
          nino: {
            nombre: f.nino.nombre,
            apellido: f.nino.apellido,
            dni: f.nino.dni,
            fechaNacimiento: fechaAIso(f.nino.fechaNacimiento),
            infoAdicional: f.nino.infoAdicional,
          },
          contacto: vinculo
            ? {
                responsableId: vinculo.responsableId,
                nombre: vinculo.responsable.nombre,
                apellido: vinculo.responsable.apellido,
                whatsapp: vinculo.responsable.whatsapp,
                email: vinculo.responsable.email,
                parentesco: vinculo.parentesco,
                ninosVinculados: vinculo.responsable._count.ninos,
              }
            : null,
        },
      ];
    }),
  );

  const gruposPorTemporada = new Map<number, { id: number; nombre: string }[]>();
  for (const g of grupos) {
    gruposPorTemporada.set(g.temporadaId, [...(gruposPorTemporada.get(g.temporadaId) ?? []), { id: g.id, nombre: g.nombre }]);
  }

  return planificarImportacion(archivo, {
    actuales,
    gruposPorTemporada,
    responsablePorWhatsapp: new Map(responsables.map((r) => [r.whatsapp, r.id])),
    hoy: fechaAIso(hoyEnArgentina()),
  });
}

/** Aplica todas las filas válidas del plan en una única transacción. */
export async function aplicarPlan(plan: PlanImportacion): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      for (const { datos: d } of plan.cambios) {
        if (Object.keys(d.nino).length > 0) {
          const { fechaNacimiento, ...resto } = d.nino;
          await tx.nino.update({
            where: { id: d.ninoId },
            data: { ...resto, ...(fechaNacimiento ? { fechaNacimiento: fechaDesdeIso(fechaNacimiento) } : {}) },
          });
        }
        if (Object.keys(d.inscripcion).length > 0) {
          await tx.inscripcionNino.update({ where: { id: d.inscripcionNinoId }, data: d.inscripcion });
        }
        if (d.responsableId !== null && Object.keys(d.responsable).length > 0) {
          await tx.responsable.update({ where: { id: d.responsableId }, data: d.responsable });
        }
        if (d.responsableId !== null && d.parentesco !== null) {
          await tx.ninoResponsable.update({
            where: { ninoId_responsableId: { ninoId: d.ninoId, responsableId: d.responsableId } },
            data: { parentesco: d.parentesco },
          });
        }
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}
