import type { NextRequest } from "next/server";
import { listarInscriptos, temporadaParaListado } from "@/lib/admin/consultas";
import { leerFiltros } from "@/lib/admin/filtros";
import { usuarioConPermiso } from "@/lib/auth/usuario";
import { generarCsvInscriptos } from "@/lib/csv/inscriptos";
import { fechaAIso, hoyEnArgentina } from "@/lib/dominio/fechas";
import { registrar } from "@/lib/registro/servidor";
import { aOpcion, preciosDe } from "@/lib/temporada";

/** Descarga el listado (con los mismos filtros que la pantalla) como CSV para Excel. */
export async function GET(request: NextRequest) {
  // El proxy ya filtra /api/admin/*, pero se vuelve a verificar acá (sesión y permiso).
  const usuario = await usuarioConPermiso("inscriptos.exportar");
  if (!usuario) return Response.json({ ok: false, error: "No autorizado." }, { status: 403 });

  const filtros = leerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const temporada = await temporadaParaListado(filtros.temporada);
  if (!temporada) return Response.json({ ok: false, error: "No hay temporadas." }, { status: 404 });

  const filas = await listarInscriptos(filtros, temporada);
  await registrar(
    { accion: "csv.descargar", entidad: "temporada", entidadId: temporada.id, detalle: { filas: filas.length, filtros: { ...filtros } } },
    usuario,
  );
  const csv = generarCsvInscriptos(filas, {
    opciones: temporada.semanas.map(aOpcion),
    precios: preciosDe(temporada),
  });
  const nombre = `inscriptos-${temporada.nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${fechaAIso(hoyEnArgentina())}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
