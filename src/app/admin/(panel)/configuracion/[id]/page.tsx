import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { exigirAdmin } from "@/lib/auth/admin";
import { fechaAIso, sumarDias } from "@/lib/dominio/fechas";
import { LARGO_MAXIMO_PERIODO, NOMBRES_PERIODO_SUGERIDOS, periodo } from "@/lib/dominio/periodo";
import { ETIQUETA_TURNO } from "@/lib/formato";
import { TURNOS } from "@/lib/validacion/inscripcion";
import { prisma } from "@/lib/prisma";
import {
  actualizarTemporada,
  asignarSinGrupo,
  cambiarInscripcion,
  eliminarSemana,
  guardarGrupos,
  guardarOpciones,
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

function Casilla({ nombre, valor, etiqueta, marcada }: { nombre: string; valor?: string; etiqueta: string; marcada: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={nombre} value={valor} defaultChecked={marcada} className="size-4 accent-marino" />
      {etiqueta}
    </label>
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
  const p = periodo(temporada.nombrePeriodo);
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
              <Campo
                nombre="cupo"
                etiqueta="Cupo total"
                tipo="number"
                min={1}
                valor={temporada.cupo}
                className="sm:col-span-3"
                ayuda="Cantidad de lugares. En la página de inicio se muestra cuántos quedan (cada niño inscripto ocupa uno, salvo los cancelados). Dejalo vacío para no mostrar el contador."
              />
              <Campo nombre="edadMinima" etiqueta="Edad mínima" tipo="number" min={0} max={25} valor={temporada.edadMinima} requerido />
              <Campo nombre="edadMaxima" etiqueta="Edad máxima" tipo="number" min={0} max={25} valor={temporada.edadMaxima} requerido />
              <p className="self-end pb-2 text-xs sm:col-span-1">
                Años cumplidos al inscribirse, incluidos los dos extremos. Fuera de ese rango el formulario no deja inscribir.
              </p>
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

      <Seccion titulo="Turnos y formas de asistir">
        <p className="mb-3 text-sm">Lo que no esté marcado no aparece en el formulario de inscripción.</p>
        <FormAccion accion={guardarOpciones.bind(null, id)} textoBoton="Guardar">
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold text-marino">Turnos</legend>
              {TURNOS.map((t) => (
                <div key={t} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Casilla nombre="turnos" valor={t} etiqueta={`Turno ${ETIQUETA_TURNO[t].toLowerCase()}`} marcada={temporada.turnos.includes(t)} />
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Horario del turno {ETIQUETA_TURNO[t].toLowerCase()}</span>
                    <input
                      name={t === "MANANA" ? "horarioManana" : "horarioTarde"}
                      defaultValue={t === "MANANA" ? temporada.horarioManana : temporada.horarioTarde}
                      placeholder="Horario, ej. 8:30 a 12:30 hs"
                      maxLength={60}
                      className="w-56 rounded-lg border border-marino/30 px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              ))}
              <p className="text-xs">El horario se muestra en el formulario junto al turno.</p>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold text-marino">Formas de asistir</legend>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Cada período se llama
                <input
                  name="nombrePeriodo"
                  list="nombres-periodo"
                  defaultValue={temporada.nombrePeriodo}
                  required
                  maxLength={LARGO_MAXIMO_PERIODO}
                  className="w-36 rounded-lg border border-marino/30 px-2 py-1 text-sm"
                />
                <datalist id="nombres-periodo">
                  {NOMBRES_PERIODO_SUGERIDOS.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <p className="text-xs">En singular, por ejemplo Semana o Quincena. El formulario lo usa tal cual.</p>
              <Casilla nombre="permiteSemanas" etiqueta={`Por ${p.plural.toLowerCase()} (y "Colonia completa")`} marcada={temporada.permiteSemanas} />
              <Casilla nombre="permitePorDia" etiqueta="Por día" marcada={temporada.permitePorDia} />
            </fieldset>
          </div>
        </FormAccion>
        {(temporada.permiteSemanas || temporada.permitePorDia) && !temporada.semanas.some((s) => s.activa) && (
          <p role="alert" className="mt-3 text-sm font-medium text-rojo">
            No hay ningún período activo ({p.plural.toLowerCase()}): las familias no van a poder elegir ni períodos ni días.
          </p>
        )}
      </Seccion>

      <Seccion titulo={p.plural}>
        <p className="mb-3 text-sm">
          Solo se ofrecen las {p.plural.toLowerCase()} activas, con su número y sus fechas. Las familias que eligen
          &quot;por día&quot; ven los días de lunes a viernes dentro de ellas. Desactivar una no cambia a los que ya se inscribieron.
        </p>
        <div className="space-y-3">
          {temporada.semanas.map((s) => (
            <div key={s.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-marino/10 p-3">
              <FormAccion accion={guardarSemana.bind(null, id, s.id)} textoBoton="Guardar" variante="secundario" className="flex flex-wrap items-end gap-3 [&>div:last-child]:mt-0">
                <Campo nombre="numero" etiqueta="N.º" tipo="number" min={1} valor={s.numero} requerido idPrefijo={`semana-${s.id}`} className="w-20" />
                <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={fechaAIso(s.fechaInicio)} requerido idPrefijo={`semana-${s.id}`} />
                <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={fechaAIso(s.fechaFin)} requerido idPrefijo={`semana-${s.id}`} />
                <div className="pb-2.5">
                  <Casilla nombre="activa" etiqueta="Activa" marcada={s.activa} />
                </div>
              </FormAccion>
              <FormAccion accion={eliminarSemana.bind(null, s.id)} textoBoton="Eliminar" textoPendiente="Eliminando…" variante="peligro" />
              <p className="w-full text-xs">{s._count.inscripciones} inscriptos para este período completo</p>
            </div>
          ))}
        </div>
        <h3 className="mt-5 mb-2 text-sm font-semibold text-marino">Agregar período ({p.singular.toLowerCase()})</h3>
        <FormAccion accion={guardarSemana.bind(null, id, null)} textoBoton="Agregar" className="flex flex-wrap items-end gap-3 [&>div:last-child]:mt-0">
          <Campo nombre="numero" etiqueta="N.º" tipo="number" min={1} valor={(ultima?.numero ?? 0) + 1} requerido idPrefijo="semana-nueva" className="w-20" />
          <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={proximoLunes ? fechaAIso(proximoLunes) : ""} requerido idPrefijo="semana-nueva" />
          <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={proximoLunes ? fechaAIso(sumarDias(proximoLunes, 4)) : ""} requerido idPrefijo="semana-nueva" />
          <div className="pb-2.5">
            <Casilla nombre="activa" etiqueta="Activa" marcada />
          </div>
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
