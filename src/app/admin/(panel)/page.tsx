import Link from "next/link";
import { Suspense } from "react";
import { asignarSinGrupo } from "@/app/admin/(panel)/configuracion/acciones";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { InsigniaDuplicado, InsigniaEstado, InsigniaSinGrupo } from "@/components/admin/Insignias";
import { IconoWhatsapp } from "@/components/marca/iconos";
import { contarSinGrupo, listarInscriptos, listarTemporadas, temporadaParaListado, type FilaInscripto } from "@/lib/admin/consultas";
import { leerFiltros } from "@/lib/admin/filtros";
import { exigirAdmin } from "@/lib/auth/admin";
import { FiltrosListado } from "./FiltrosListado";
import { fechaAIso } from "@/lib/dominio/fechas";
import { ETIQUETA_TURNO, formatearDiaCorto, formatearFechaHora, formatearWhatsapp } from "@/lib/formato";

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
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-marino/5 text-xs tracking-wide text-marino uppercase">
              <tr>
                <th scope="col" className="px-3 py-3">Alta</th>
                <th scope="col" className="px-3 py-3">Niño/a</th>
                <th scope="col" className="px-3 py-3">DNI</th>
                <th scope="col" className="px-3 py-3">Edad</th>
                <th scope="col" className="px-3 py-3">Grupo</th>
                <th scope="col" className="px-3 py-3">Turno</th>
                <th scope="col" className="px-3 py-3">Asistencia</th>
                <th scope="col" className="px-3 py-3">Estado</th>
                <th scope="col" className="px-3 py-3">Contacto principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marino/10">
              {filas.map((f) => (
                <Fila key={f.id} fila={f} totalSemanas={temporada.semanas.length} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Fila({ fila: f, totalSemanas }: { fila: FilaInscripto; totalSemanas: number }) {
  const contacto = f.nino.responsables[0];
  const asistencia =
    f.modalidad === "SEMANAS"
      ? f.semanas.length === totalSemanas
        ? "Todas las semanas"
        : f.semanas
            .map((s) => `S${s.semana.numero}`)
            .sort()
            .join(", ")
      : `${f.dias.length} ${f.dias.length === 1 ? "día" : "días"}`;
  const detalleDias = f.modalidad === "POR_DIA" ? f.dias.map((d) => formatearDiaCorto(fechaAIso(d.fecha))).join(", ") : undefined;

  return (
    <tr className="align-top hover:bg-crema/50">
      <td className="px-3 py-3 whitespace-nowrap">
        {formatearFechaHora(f.inscripcion.fechaAlta)}
        <div className="text-xs text-texto/80">Insc. N.º {f.inscripcion.numero}</div>
      </td>
      <td className="px-3 py-3">
        <Link href={`/admin/inscriptos/${f.id}`} className="font-semibold text-marino underline-offset-2 hover:underline">
          {f.nino.apellido}, {f.nino.nombre}
        </Link>
        {f.posibleDuplicado && (
          <div className="mt-1">
            <InsigniaDuplicado />
          </div>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap tabular-nums">{f.nino.dni}</td>
      <td className="px-3 py-3 tabular-nums">{f.edadAlInscribir}</td>
      <td className="px-3 py-3">{f.grupoEdad?.nombre ?? <InsigniaSinGrupo />}</td>
      <td className="px-3 py-3">{ETIQUETA_TURNO[f.turno]}</td>
      <td className="px-3 py-3" title={detalleDias}>
        {asistencia}
      </td>
      <td className="px-3 py-3">
        <InsigniaEstado estado={f.estado} />
      </td>
      <td className="px-3 py-3">
        {contacto ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              {contacto.responsable.nombre} {contacto.responsable.apellido}
              <div className="text-xs text-texto/80">
                {contacto.parentesco} · {formatearWhatsapp(contacto.responsable.whatsapp)}
              </div>
            </div>
            <a
              href={`https://wa.me/${contacto.responsable.whatsapp.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp con ${contacto.responsable.nombre} ${contacto.responsable.apellido}`}
              title="Abrir WhatsApp"
              className="shrink-0 rounded-lg border border-verde/50 p-1.5 text-marino transition hover:bg-verde/10"
            >
              <IconoWhatsapp className="size-5" />
            </a>
          </div>
        ) : (
          <span className="text-rojo">Sin contacto</span>
        )}
      </td>
    </tr>
  );
}
