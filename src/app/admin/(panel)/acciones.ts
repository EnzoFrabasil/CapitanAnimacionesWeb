"use server";

import { refresh } from "next/cache";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { edicionRapidaSchema, mensajesDeError, type EdicionRapida } from "@/lib/validacion/admin";

// Acciones del listado de inscriptos (edición rápida desde la tabla).

export async function guardarEdicionRapida(inscripcionNinoId: number, datos: EdicionRapida): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = edicionRapidaSchema.safeParse(datos);
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const d = r.data;

  const actual = await prisma.inscripcionNino.findUnique({
    where: { id: inscripcionNinoId },
    select: {
      ninoId: true,
      inscripcion: { select: { temporada: { select: { gruposEdad: { select: { id: true } } } } } },
      nino: {
        select: {
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            take: 1,
            select: { responsableId: true },
          },
        },
      },
    },
  });
  if (!actual) return fallo("El inscripto ya no existe. Recargá la página.");
  if (d.grupoEdadId !== null && !actual.inscripcion.temporada.gruposEdad.some((g) => g.id === d.grupoEdadId)) {
    return fallo("El grupo no es de esta temporada.");
  }
  const principal = actual.nino.responsables[0]?.responsableId;

  try {
    await prisma.$transaction([
      prisma.nino.update({ where: { id: actual.ninoId }, data: d.nino }),
      prisma.inscripcionNino.update({
        where: { id: inscripcionNinoId },
        data: { grupoEdadId: d.grupoEdadId, turno: d.turno, estado: d.estado },
      }),
      ...(principal && d.contacto ? [prisma.responsable.update({ where: { id: principal }, data: d.contacto })] : []),
    ]);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
  refresh();
  return exito("Cambios guardados.");
}

/**
 * Elimina un inscripto de la temporada. Si el niño/a no tiene otras
 * inscripciones se borran también sus datos, y se borran la inscripción, la
 * familia y los contactos que quedan sin uso (son datos personales).
 */
export async function eliminarInscripto(inscripcionNinoId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const fila = await tx.inscripcionNino.findUnique({
        where: { id: inscripcionNinoId },
        select: {
          inscripcionId: true,
          nino: { select: { id: true, familiaId: true, responsables: { select: { responsableId: true } } } },
        },
      });
      if (!fila) throw new Error("NO_EXISTE");
      const { nino } = fila;

      await tx.inscripcionNino.delete({ where: { id: inscripcionNinoId } });

      if ((await tx.inscripcionNino.count({ where: { ninoId: nino.id } })) === 0) {
        await tx.nino.delete({ where: { id: nino.id } }); // borra también sus vínculos con contactos
      }
      if ((await tx.inscripcionNino.count({ where: { inscripcionId: fila.inscripcionId } })) === 0) {
        await tx.inscripcion.delete({ where: { id: fila.inscripcionId } });
      }
      for (const { responsableId } of nino.responsables) {
        const enUso =
          (await tx.ninoResponsable.count({ where: { responsableId } })) +
          (await tx.inscripcion.count({ where: { responsablePrincipalId: responsableId } }));
        if (enUso === 0) await tx.responsable.delete({ where: { id: responsableId } });
      }
      const familiaEnUso =
        (await tx.nino.count({ where: { familiaId: nino.familiaId } })) +
        (await tx.inscripcion.count({ where: { familiaId: nino.familiaId } }));
      if (familiaEnUso === 0) await tx.familia.delete({ where: { id: nino.familiaId } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_EXISTE") return fallo("El inscripto ya no existe. Recargá la página.");
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Inscripto eliminado.");
}
