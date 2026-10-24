import "server-only";
import { fechaAIso } from "@/lib/dominio/fechas";
import { describirAsistencia, precioChico, totalFamilia, type Asistencia, type Opcion, type Precios, type TotalFamilia } from "@/lib/dominio/opciones";
import { prisma } from "@/lib/prisma";
import { ORDEN_LISTA_ESPERA, condicionDeFiltros, type Filtros } from "./filtros";

export async function listarTemporadas() {
  return prisma.temporada.findMany({ orderBy: [{ anio: "desc" }, { createdAt: "desc" }] });
}

/** Temporada pedida por filtro, o la abierta, o la más reciente. */
export async function temporadaParaListado(id: number | undefined) {
  const incluir = {
    semanas: { orderBy: { numero: "asc" as const } },
    gruposEdad: { orderBy: { edadMin: "asc" as const } },
  };
  if (id) {
    const t = await prisma.temporada.findUnique({ where: { id }, include: incluir });
    if (t) return t;
  }
  return prisma.temporada.findFirst({
    orderBy: [{ inscripcionAbierta: "desc" }, { anio: "desc" }, { createdAt: "desc" }],
    include: incluir,
  });
}

export type TemporadaListado = NonNullable<Awaited<ReturnType<typeof temporadaParaListado>>>;

/** Una fila por niño inscripto, en orden de lista de espera, con sus contactos (el principal primero). */
export async function listarInscriptos(filtros: Filtros, temporada: TemporadaListado) {
  return prisma.inscripcionNino.findMany({
    where: condicionDeFiltros(filtros, temporada.id),
    orderBy: ORDEN_LISTA_ESPERA,
    include: {
      inscripcion: { select: { numero: true, fechaAlta: true } },
      grupoEdad: { select: { nombre: true } },
      semanas: { select: { semanaId: true } },
      dias: { select: { fecha: true, semanaId: true }, orderBy: { fecha: "asc" } },
      nino: {
        include: {
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            include: { responsable: true },
          },
        },
      },
    },
  });
}

export type FilaInscripto = Awaited<ReturnType<typeof listarInscriptos>>[number];

export async function contarSinGrupo(temporadaId: number) {
  return prisma.inscripcionNino.count({ where: { grupoEdadId: null, inscripcion: { temporadaId } } });
}

/** Chicos de una familia en la temporada (sin cancelados) y su total con el descuento por hermanos. */
export interface ResumenFamilia {
  chicos: { id: number; nombre: string; apellido: string; grupo: string | null; asistencia: string }[];
  total: TotalFamilia;
}

export async function resumenFamilias(
  temporadaId: number,
  familiaIds: readonly number[],
  opciones: readonly Opcion[],
  precios: Precios,
): Promise<Record<number, ResumenFamilia>> {
  const [inscriptos, familias] = await Promise.all([
    prisma.inscripcionNino.findMany({
      where: { inscripcion: { temporadaId }, nino: { familiaId: { in: [...familiaIds] } }, estado: { not: "CANCELADO" } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        modalidad: true,
        grupoEdad: { select: { nombre: true } },
        semanas: { select: { semanaId: true } },
        dias: { select: { fecha: true, semanaId: true } },
        nino: { select: { nombre: true, apellido: true, familiaId: true } },
      },
    }),
    prisma.familia.findMany({ where: { id: { in: [...familiaIds] } }, select: { id: true, descuentoHermanos: true } }),
  ]);

  const resumen: Record<number, ResumenFamilia> = {};
  for (const f of familias) {
    const chicos = inscriptos.filter((x) => x.nino.familiaId === f.id);
    const asistencias = chicos.map(
      (x): Asistencia => ({
        modalidad: x.modalidad,
        opciones: x.semanas.map((s) => s.semanaId),
        dias: x.dias.map((d) => ({ fecha: fechaAIso(d.fecha), opcion: d.semanaId })),
      }),
    );
    resumen[f.id] = {
      chicos: chicos.map((x, i) => ({
        id: x.id,
        nombre: x.nino.nombre,
        apellido: x.nino.apellido,
        grupo: x.grupoEdad?.nombre ?? null,
        asistencia: describirAsistencia(opciones, asistencias[i]),
      })),
      total: totalFamilia(
        asistencias.map((a) => precioChico(opciones, precios, a)),
        precios.descuentoHermanos,
        f.descuentoHermanos,
      ),
    };
  }
  return resumen;
}
