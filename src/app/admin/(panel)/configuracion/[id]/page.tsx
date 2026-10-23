import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { exigirAdmin } from "@/lib/auth/admin";
import { fechaAIso, sumarDias } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import {
  actualizarTemporada,
  asignarSinGrupo,
  cambiarInscripcion,
  eliminarSemana,
  guardarGrupos,
  guardarSemana,
} from "../acciones";
import { EditorGrupos } from "./EditorGrupos";

export default function PaginaTemporada({ params }: PageProps<"/admin/configuracion/[id]">) {
  return (
    <Suspense fallback={<p>Cargando temporada…</p>}>
      <Temporada params={params} />
    </Suspense>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = `seccion-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={claseTarjeta}>
      <h2 id={id} className="mb-3 text-lg font-semibold text-marino">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

async function Temporada({ params }: Pick<PageProps<"/admin/configuracion/[id]">, "params">) {
  await exigirAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const temporada = await prisma.temporada.findUnique({
    where: { id },
    include: {
      semanas: { orderBy: { numero: "asc" }, include: { _count: { select: { inscripciones: true } } } },
      gruposEdad: { orderBy: { edadMin: "asc" } },
    },
  });
  if (!temporada) notFound();

  const sinGrupo = await prisma.inscripcionNino.count({ where: { grupoEdadId: null, inscripcion: { temporadaId: id } } });
  const ultima = temporada.semanas.at(-1);
  const proximoLunes = ultima ? sumarDias(ultima.fechaFin, 3) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/configuracion" className="text-sm font-semibold text-marino underline">
          ← Temporadas
        </Link>
        <h1 className="mt-1 font-titulo text-3xl font-bold text-marino">{temporada.nombre}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Datos">
          <FormAccion accion={actualizarTemporada.bind(null, id)} textoBoton="Guardar">
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo nombre="nombre" etiqueta="Nombre" valor={temporada.nombre} requerido className="sm:col-span-2" />
              <Campo nombre="anio" etiqueta="Año" tipo="number" valor={temporada.anio} requerido />
            </div>
          </FormAccion>
        </Seccion>

        <Seccion titulo="Inscripción">
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden className={`size-3 rounded-full ${temporada.inscripcionAbierta ? "bg-verde" : "bg-marino/30"}`} />
            La inscripción está <strong>{temporada.inscripcionAbierta ? "abierta" : "cerrada"}</strong>.
          </p>
          <FormAccion
            accion={cambiarInscripcion.bind(null, id, !temporada.inscripcionAbierta)}
            textoBoton={temporada.inscripcionAbierta ? "Cerrar inscripción" : "Abrir inscripción"}
            variante={temporada.inscripcionAbierta ? "peligro" : "destacado"}
            className="mt-3"
          />
          {!temporada.inscripcionAbierta && (
            <p className="mt-2 text-xs">Solo puede haber una temporada abierta: al abrir esta se cierran las demás.</p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Semanas">
        <p className="mb-3 text-sm">
          Las familias que eligen &quot;por día&quot; ven los días de lunes a viernes dentro de estas semanas.
        </p>
        <div className="space-y-3">
          {temporada.semanas.map((s) => (
            <div key={s.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-marino/10 p-3">
              <FormAccion accion={guardarSemana.bind(null, id, s.id)} textoBoton="Guardar" variante="secundario" className="flex flex-wrap items-end gap-3 [&>div:last-child]:mt-0">
                <Campo nombre="numero" etiqueta="N.º" tipo="number" min={1} valor={s.numero} requerido idPrefijo={`semana-${s.id}`} className="w-20" />
                <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={fechaAIso(s.fechaInicio)} requerido idPrefijo={`semana-${s.id}`} />
                <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={fechaAIso(s.fechaFin)} requerido idPrefijo={`semana-${s.id}`} />
              </FormAccion>
              <FormAccion accion={eliminarSemana.bind(null, s.id)} textoBoton="Eliminar" textoPendiente="Eliminando…" variante="peligro" />
              <p className="w-full text-xs">{s._count.inscripciones} inscriptos por semana completa</p>
            </div>
          ))}
        </div>
        <h3 className="mt-5 mb-2 text-sm font-semibold text-marino">Agregar semana</h3>
        <FormAccion accion={guardarSemana.bind(null, id, null)} textoBoton="Agregar semana" className="flex flex-wrap items-end gap-3 [&>div:last-child]:mt-0">
          <Campo nombre="numero" etiqueta="N.º" tipo="number" min={1} valor={(ultima?.numero ?? 0) + 1} requerido idPrefijo="semana-nueva" className="w-20" />
          <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={proximoLunes ? fechaAIso(proximoLunes) : ""} requerido idPrefijo="semana-nueva" />
          <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={proximoLunes ? fechaAIso(sumarDias(proximoLunes, 4)) : ""} requerido idPrefijo="semana-nueva" />
        </FormAccion>
      </Seccion>

      <Seccion titulo="Grupos de edad">
        <EditorGrupos
          accion={guardarGrupos.bind(null, id)}
          grupos={temporada.gruposEdad.map(({ id: gid, nombre, edadMin, edadMax }) => ({ id: gid, nombre, edadMin, edadMax }))}
        />
        <div className="mt-5 border-t border-marino/10 pt-4">
          <p className="text-sm">
            Niños sin grupo en esta temporada: <strong>{sinGrupo}</strong>
          </p>
          {sinGrupo > 0 && (
            <FormAccion
              accion={asignarSinGrupo.bind(null, id)}
              textoBoton="Asignar grupo a los niños sin grupo"
              textoPendiente="Asignando…"
              variante="secundario"
              className="mt-2"
            />
          )}
        </div>
      </Seccion>
    </div>
  );
}
