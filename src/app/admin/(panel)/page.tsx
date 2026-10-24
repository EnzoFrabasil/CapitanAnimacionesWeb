import Link from "next/link";
import { Suspense } from "react";
import { asignarSinGrupo } from "@/app/admin/(panel)/configuracion/acciones";
import { claseBoton, claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { contarSinGrupo, listarInscriptos, listarTemporadas, temporadaParaListado } from "@/lib/admin/consultas";
import { filtrosAQuery, leerFiltros } from "@/lib/admin/filtros";
import { exigirAdmin } from "@/lib/auth/admin";
import { FilaInscripto } from "./FilaInscripto";
import { FiltrosListado } from "./FiltrosListado";

export default function PaginaListado({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="py-12 text-center">Cargando inscriptos…</p>}>
      <Listado searchParams={searchParams} />
    </Suspense>
  );
}

async function Listado({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await exigirAdmin();
  const filtros = leerFiltros(await searchParams);
  const [temporadas, temporada] = await Promise.all([listarTemporadas(), temporadaParaListado(filtros.temporada)]);

  if (!temporada) {
    return (
      <p className="py-12 text-center">
        Todavía no hay temporadas.{" "}
        <Link href="/admin/configuracion" className="font-semibold text-marino underline">
          Creá una en Configuración
        </Link>
        .
      </p>
    );
  }

  const [filas, sinGrupo] = await Promise.all([listarInscriptos(filtros, temporada), contarSinGrupo(temporada.id)]);
  const hayFiltros = Boolean(filtros.grupo || filtros.turno || filtros.semana || filtros.estado || filtros.duplicados || filtros.q);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-titulo text-3xl font-bold text-marino">Inscriptos</h1>
          <p className="text-sm">
            {temporada.nombre} · inscripción {temporada.inscripcionAbierta ? "abierta" : "cerrada"} · ordenados por
            fecha de alta (lista de espera)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/importar" className={claseBoton.secundario}>
            Importar CSV
          </Link>
          {/* Descarga con los filtros activos. */}
          <a href={`/api/admin/csv?${filtrosAQuery({ ...filtros, temporada: temporada.id })}`} className={claseBoton.destacado} download>
            Descargar CSV
          </a>
        </div>
      </div>

      <section aria-label="Filtros" className={claseTarjeta}>
        <FiltrosListado
          filtros={filtros}
          temporadaId={temporada.id}
          temporadas={temporadas.map((t) => ({ id: t.id, nombre: t.nombre }))}
          grupos={temporada.gruposEdad.map((g) => ({ id: g.id, nombre: g.nombre }))}
          semanas={temporada.semanas.map((s) => ({ id: s.id, numero: s.numero }))}
        />
      </section>

      {sinGrupo > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amarillo bg-amarillo/15 px-4 py-3">
          <p className="text-sm text-marino">
            <strong>{sinGrupo}</strong> {sinGrupo === 1 ? "niño/a no tiene" : "niños no tienen"} grupo asignado en esta temporada.
          </p>
          <FormAccion accion={asignarSinGrupo.bind(null, temporada.id)} textoBoton="Asignar grupo a los niños sin grupo" textoPendiente="Asignando…" variante="secundario" />
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
        <div className="overflow-x-auto rounded-2xl border border-marino/10">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-marino/5 text-xs tracking-wide text-marino uppercase">
              <tr>
                <th scope="col" className="px-3 py-3">Alta</th>
                <th scope="col" className="px-3 py-3">Niño/a</th>
                <th scope="col" className="px-3 py-3">Documento</th>
                <th scope="col" className="px-3 py-3">Edad</th>
                <th scope="col" className="px-3 py-3">Grupo</th>
                <th scope="col" className="px-3 py-3">Turno</th>
                <th scope="col" className="px-3 py-3">Asistencia</th>
                <th scope="col" className="px-3 py-3">Estado</th>
                <th scope="col" className="px-3 py-3">Contacto principal</th>
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marino/10">
              {filas.map((f) => (
                <FilaInscripto
                  key={f.id}
                  fila={f}
                  totalSemanas={temporada.semanas.length}
                  grupos={temporada.gruposEdad.map((g) => ({ id: g.id, nombre: g.nombre }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
