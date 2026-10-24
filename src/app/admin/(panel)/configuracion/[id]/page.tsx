import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { exigirAdmin } from "@/lib/auth/admin";
import { fechaAIso, sumarDias } from "@/lib/dominio/fechas";
import { formatearPrecio, horarios, rangoDeFechas, type Opcion, type Precios } from "@/lib/dominio/opciones";
import { formatearFecha } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { aOpcion, preciosDe } from "@/lib/temporada";
import {
  actualizarTemporada,
  asignarSinGrupo,
  cambiarInscripcion,
  eliminarSemana,
  guardarGrupos,
  guardarPrecios,
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

/** "Quincena 2" → "Quincena 3"; si no termina en número, vacío. */
function siguienteNombre(nombre: string) {
  const m = nombre.match(/^(.*\D)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : "";
}

function CamposOpcion({
  prefijo,
  opcion,
}: {
  prefijo: string;
  opcion: {
    numero: number;
    nombre: string;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    horaInicio: string;
    horaFin: string;
    precio: number | null;
    activa: boolean;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <Campo nombre="nombre" etiqueta="Nombre" valor={opcion.nombre} requerido idPrefijo={prefijo} className="col-span-2 sm:col-span-4" ayuda="Ej. Quincena 1, Semana 2, Enero." />
      <Campo nombre="numero" etiqueta="Orden" tipo="number" min={1} valor={opcion.numero} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="fechaInicio" etiqueta="Desde" tipo="date" valor={opcion.fechaInicio ? fechaAIso(opcion.fechaInicio) : ""} requerido idPrefijo={prefijo} className="sm:col-span-3" />
      <Campo nombre="fechaFin" etiqueta="Hasta" tipo="date" valor={opcion.fechaFin ? fechaAIso(opcion.fechaFin) : ""} requerido idPrefijo={prefijo} className="sm:col-span-3" />
      <Campo nombre="horaInicio" etiqueta="Hora de entrada" tipo="time" valor={opcion.horaInicio} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="horaFin" etiqueta="Hora de salida" tipo="time" valor={opcion.horaFin} requerido idPrefijo={prefijo} className="sm:col-span-2" />
      <Campo nombre="precio" etiqueta="Precio ($)" tipo="number" min={0} valor={opcion.precio} requerido idPrefijo={prefijo} className="col-span-2 sm:col-span-2" />
      <div className="col-span-2 sm:col-span-6">
        <Casilla nombre="activa" etiqueta="Activa (se ofrece en el formulario)" marcada={opcion.activa} />
      </div>
    </div>
  );
}

/** Resumen de lo que aparece en el formulario público. */
function VistaPrevia({ opciones, precios, porDia }: { opciones: Opcion[]; precios: Precios; porDia: boolean }) {
  if (opciones.length === 0) return <p className="text-sm">No hay opciones activas.</p>;
  return (
    <div className="space-y-4 text-sm">
      {horarios(opciones).map((h) => (
        <div key={h.clave}>
          <p className="mb-1 font-semibold text-marino">Horario: {h.texto}</p>
          <ul className="space-y-1">
            {h.opciones.length > 1 && (
              <li className="flex justify-between gap-3 rounded-lg bg-amarillo/30 px-3 py-1.5 font-semibold">
                <span>
                  Colonia completa{" "}
                  <span className="font-normal">
                    ({formatearFecha(rangoDeFechas(h.opciones).desde)} al {formatearFecha(rangoDeFechas(h.opciones).hasta)})
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatearPrecio(precios.coloniaCompleta ?? h.opciones.reduce((t, o) => t + o.precio, 0))}
                </span>
              </li>
            )}
            {h.opciones.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 rounded-lg border border-marino/10 px-3 py-1.5">
                <span>
                  {o.nombre}{" "}
                  <span className="text-texto/80">
                    ({formatearFecha(o.fechaInicio)} al {formatearFecha(o.fechaFin)})
                  </span>
                </span>
                <span className="tabular-nums">{formatearPrecio(o.precio)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {porDia && <p>También pueden elegir días sueltos ({precios.dia === null ? "precio a confirmar" : `${formatearPrecio(precios.dia)} por día`}).</p>}
      {precios.descuentoHermanos > 0 && (
        <p>Con 2 o más hermanos: {precios.descuentoHermanos}% de descuento sobre el total de la familia.</p>
      )}
    </div>
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
  const opcionesActivas = temporada.semanas.filter((s) => s.activa).map(aOpcion);

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

      <Seccion titulo="Opciones de inscripción">
        <p className="mb-4 text-sm">
          Cada opción es lo que la familia marca en el formulario: le ponés el nombre que quieras (Quincena 1, Semana 2,
          Enero…), sus fechas, su horario y su precio. Una familia puede elegir varias opciones para un chico, pero todas del
          mismo horario. Si elige todas las de un horario, es <strong>colonia completa</strong> y se cobra ese precio.
          Desactivar una opción la saca del formulario sin tocar a los que ya se inscribieron.
        </p>
        {opcionesActivas.length === 0 && (
          <p role="alert" className="mb-4 text-sm font-medium text-rojo">
            No hay ninguna opción activa: las familias no van a poder inscribirse.
          </p>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          {temporada.semanas.map((s) => (
            <article
              key={s.id}
              aria-label={s.nombre || `Opción ${s.numero}`}
              className={`rounded-2xl border-2 p-4 ${s.activa ? "border-marino/20 bg-white" : "border-dashed border-marino/15 bg-marino/[0.03]"}`}
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-titulo text-lg font-semibold text-marino">{s.nombre || `Opción ${s.numero}`}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.activa ? "bg-verde/15 text-verde" : "bg-marino/10 text-marino/70"}`}>
                  {s.activa ? "Activa" : "Desactivada"} · {s._count.inscripciones} inscriptos
                </span>
              </div>
              <FormAccion accion={guardarSemana.bind(null, id, s.id)} textoBoton="Guardar" variante="secundario">
                <CamposOpcion prefijo={`opcion-${s.id}`} opcion={s} />
              </FormAccion>
              <FormAccion
                accion={eliminarSemana.bind(null, s.id)}
                textoBoton="Eliminar opción"
                textoPendiente="Eliminando…"
                variante="peligro"
                className="mt-2"
              />
            </article>
          ))}
        </div>

        <details className="mt-5 rounded-2xl border-2 border-dashed border-marino/25 p-4" open={temporada.semanas.length === 0}>
          <summary className="cursor-pointer font-semibold text-marino">+ Agregar opción</summary>
          <FormAccion accion={guardarSemana.bind(null, id, null)} textoBoton="Agregar" className="mt-3">
            <CamposOpcion
              prefijo="opcion-nueva"
              opcion={{
                numero: (ultima?.numero ?? 0) + 1,
                nombre: ultima ? siguienteNombre(ultima.nombre) : "",
                fechaInicio: proximoLunes,
                fechaFin: proximoLunes ? sumarDias(proximoLunes, 11) : null,
                horaInicio: ultima?.horaInicio ?? "08:30",
                horaFin: ultima?.horaFin ?? "12:30",
                precio: ultima?.precio ?? null,
                activa: true,
              }}
            />
          </FormAccion>
        </details>
      </Seccion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Precios y descuentos">
          <FormAccion accion={guardarPrecios.bind(null, id)} textoBoton="Guardar">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                nombre="precioColoniaCompleta"
                etiqueta="Precio colonia completa ($)"
                tipo="number"
                min={0}
                valor={temporada.precioColoniaCompleta}
                className="sm:col-span-2"
                ayuda="Se cobra cuando un chico tiene todas las opciones de su horario. Vacío = se suman los precios de cada opción."
              />
              <Campo
                nombre="descuentoHermanos"
                etiqueta="Descuento por hermanos (%)"
                tipo="number"
                min={0}
                max={100}
                valor={temporada.descuentoHermanos}
                requerido
                className="sm:col-span-2"
                ayuda="Se aplica sobre el total de la familia cuando inscribe 2 o más chicos en la temporada. Con 0 no hay descuento. Desde la ficha de cada inscripción se puede forzar o quitar."
              />
              <div className="sm:col-span-2">
                <Casilla nombre="permitePorDia" etiqueta="Permitir inscribirse por días sueltos" marcada={temporada.permitePorDia} />
                <p className="mt-1 text-xs">Los días se eligen de lunes a viernes dentro de las fechas de las opciones activas.</p>
              </div>
              <Campo
                nombre="precioDia"
                etiqueta="Precio por día suelto ($)"
                tipo="number"
                min={0}
                valor={temporada.precioDia}
                ayuda="Vacío = a confirmar."
              />
            </div>
          </FormAccion>
        </Seccion>

        <Seccion titulo="Así lo ve la familia">
          <VistaPrevia opciones={opcionesActivas} precios={preciosDe(temporada)} porDia={temporada.permitePorDia} />
        </Seccion>
      </div>

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
