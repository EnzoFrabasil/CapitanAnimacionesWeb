import Link from "next/link";
import { Suspense } from "react";
import { asignarSinGrupo } from "@/app/admin/(panel)/colonia/acciones";
import { claseBoton, claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { contarSinGrupo, listarInscriptos, resumenFamilias } from "@/lib/admin/consultas";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { EncabezadoPagina } from "@/components/admin/Seccion";
import { filtrosAQuery, leerFiltros } from "@/lib/admin/filtros";
import { exigirPermiso } from "@/lib/auth/usuario";
import { aOpcion, preciosDe } from "@/lib/temporada";
import { TablaInscriptos } from "./TablaInscriptos";
import { FiltrosListado } from "./FiltrosListado";

export default function PaginaListado({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="py-12 text-center">Cargando inscriptos…</p>}>
      <Listado searchParams={searchParams} />
    </Suspense>
  );
}

async function Listado({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const usuario = await exigirPermiso("inscriptos.ver");
  const filtros = leerFiltros(await searchParams);
  // La temporada es la elegida en la barra de arriba.
  const temporada = await temporadaDelPanel();
  if (!temporada) return <p className="py-12 text-center">Todavía no hay temporadas.</p>;

  const [filas, sinGrupo] = await Promise.all([listarInscriptos(filtros, temporada), contarSinGrupo(temporada.id)]);
  const opciones = temporada.semanas.map(aOpcion);
  const familias = await resumenFamilias(
    temporada.id,
    [...new Set(filas.map((f) => f.nino.familiaId))],
    opciones,
    preciosDe(temporada),
  );
  const hayFiltros = Boolean(filtros.grupo || filtros.horario || filtros.semana || filtros.estado || filtros.duplicados || filtros.info || filtros.q);

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        titulo="Inscriptos"
        ayuda="Ordenados por fecha de alta (la lista de espera). Tocá la flechita de una fila para ver alergias, contactos y hermanos, o el nombre para abrir la ficha completa."
      >
          {usuario.permisos.has("inscriptos.importar") && (
            <Link href="/admin/importar" className={claseBoton.secundario}>
              Importar CSV
            </Link>
          )}
          {/* Descarga con los filtros activos. */}
          {usuario.permisos.has("inscriptos.exportar") && (
            <a href={`/api/admin/csv?${filtrosAQuery({ ...filtros, temporada: temporada.id })}`} className={claseBoton.destacado} download>
              Descargar CSV
            </a>
          )}
      </EncabezadoPagina>

      <section aria-label="Filtros" className={claseTarjeta}>
        <FiltrosListado
          filtros={filtros}
          temporadaId={temporada.id}
          grupos={temporada.gruposEdad.map((g) => ({ id: g.id, nombre: g.nombre }))}
          opciones={opciones}
        />
      </section>

      {sinGrupo > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amarillo bg-amarillo/15 px-4 py-3">
          <p className="text-sm text-marino">
            <strong>{sinGrupo}</strong> {sinGrupo === 1 ? "niño/a no tiene" : "niños no tienen"} grupo asignado en esta temporada.
          </p>
          {usuario.permisos.has("inscriptos.editar") && (
            <FormAccion accion={asignarSinGrupo.bind(null, temporada.id)} textoBoton="Asignar grupo a los niños sin grupo" textoPendiente="Asignando…" variante="secundario" />
          )}
        </div>
      )}

      <p className="text-sm" aria-live="polite">
        {filas.length} {filas.length === 1 ? "inscripto" : "inscriptos"}
        {hayFiltros && (
          <>
            {" "}con los filtros aplicados ·{" "}
            <Link href={`/admin?temporada=${temporada.id}`} className="font-semibold text-marino underline">
              Limpiar filtros
            </Link>
          </>
        )}
      </p>

      {filas.length > 0 && (
        <TablaInscriptos
          filas={filas}
          opciones={opciones}
          familias={familias}
          puedeEditar={usuario.permisos.has("inscriptos.editar")}
          puedeBorrar={usuario.permisos.has("inscriptos.borrar")}
          grupos={temporada.gruposEdad.map((g) => ({ id: g.id, nombre: g.nombre }))}
        />
      )}
    </div>
  );
}
