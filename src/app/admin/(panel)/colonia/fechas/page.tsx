import { Suspense } from "react";
import { FormAccion } from "@/components/admin/FormAccion";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { sumarDias } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import { INCLUIR_PAQUETES, aOpcion, preciosDe } from "@/lib/temporada";
import { eliminarSemana, guardarSemana } from "../acciones";
import { CamposOpcion, VistaPrevia, siguienteNombre } from "../piezas";
import { SinTemporada } from "../SinTemporada";

export default function PaginaFechas() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Fechas y horarios"
        ayuda="Las opciones que las familias marcan en el formulario (por ejemplo Quincena 1 y Quincena 2), con sus fechas, horario y precio."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Fechas />
      </Suspense>
    </div>
  );
}

async function Fechas() {
  await exigirPermiso("configuracion.editar");
  const base = await temporadaDelPanel();
  if (!base) return <SinTemporada />;
  const temporada = await prisma.temporada.findUniqueOrThrow({
    where: { id: base.id },
    include: {
      semanas: { orderBy: { numero: "asc" }, include: { _count: { select: { inscripciones: true } } } },
      paquetes: INCLUIR_PAQUETES,
    },
  });
  const ultima = temporada.semanas.at(-1);
  const proximoLunes = ultima ? sumarDias(ultima.fechaFin, 3) : null;
  const opcionesActivas = temporada.semanas.filter((s) => s.activa).map(aOpcion);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Seccion
        titulo="Opciones de inscripción"
        ayuda={
          <>
            Una familia puede elegir varias opciones para un chico, pero todas del mismo horario. Si elige todas las de un
            horario es <strong>colonia completa</strong>. Desactivar una opción la saca del formulario sin tocar a los que ya
            se inscribieron.
          </>
        }
      >
        {opcionesActivas.length === 0 && (
          <p role="alert" className="mb-4 text-sm font-medium text-rojo">
            No hay ninguna opción activa: las familias no van a poder inscribirse.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
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
              <FormAccion accion={guardarSemana.bind(null, temporada.id, s.id)} textoBoton="Guardar" variante="secundario">
                <CamposOpcion prefijo={`opcion-${s.id}`} opcion={s} />
              </FormAccion>
              <FormAccion accion={eliminarSemana.bind(null, s.id)} textoBoton="Eliminar opción" textoPendiente="Eliminando…" variante="peligro" className="mt-2" />
            </article>
          ))}
        </div>

        <details className="mt-5 rounded-2xl border-2 border-dashed border-marino/25 p-4" open={temporada.semanas.length === 0}>
          <summary className="cursor-pointer font-semibold text-marino">+ Agregar opción</summary>
          <FormAccion accion={guardarSemana.bind(null, temporada.id, null)} textoBoton="Agregar" className="mt-3">
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

      <Seccion titulo="Así lo ve la familia" ayuda="Se actualiza al guardar." className="self-start xl:sticky xl:top-4">
        <VistaPrevia opciones={opcionesActivas} precios={preciosDe(temporada)} porDia={temporada.permitePorDia} />
      </Seccion>
    </div>
  );
}
