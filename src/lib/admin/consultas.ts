import "server-only";
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

/** Una fila por niño inscripto, en orden de lista de espera, con su contacto principal. */
export async function listarInscriptos(filtros: Filtros, temporada: TemporadaListado) {
  const semana = filtros.semana ? temporada.semanas.find((s) => s.id === filtros.semana) : undefined;
  return prisma.inscripcionNino.findMany({
    where: condicionDeFiltros(filtros, temporada.id, semana ?? null),
    orderBy: ORDEN_LISTA_ESPERA,
    include: {
      inscripcion: { select: { numero: true, fechaAlta: true } },
      grupoEdad: { select: { nombre: true } },
      semanas: { select: { semana: { select: { numero: true } } } },
      dias: { select: { fecha: true }, orderBy: { fecha: "asc" } },
      nino: {
        include: {
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            take: 1,
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
