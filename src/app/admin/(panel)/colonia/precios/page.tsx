import Link from "next/link";
import { Suspense } from "react";
import { claseInput } from "@/components/admin/estilos";
import { Campo } from "@/components/admin/Campo";
import { FormAccion } from "@/components/admin/FormAccion";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { textoHorario } from "@/lib/dominio/opciones";
import { formatearFecha } from "@/lib/formato";
import { aOpcion, preciosDe } from "@/lib/temporada";
import { guardarCupo, guardarModoInscripcion, guardarPrecios, guardarPreciosOpciones } from "../acciones";
import { Casilla, VistaPrevia } from "../piezas";
import { SinTemporada } from "../SinTemporada";

export default function PaginaPrecios() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Precios y cupo"
        ayuda="Cuánto pagan las familias y cuántos lugares hay. Si cambiás un precio, cambia el total de todos los inscriptos, salvo los que tienen un precio acordado en su ficha."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Precios />
      </Suspense>
    </div>
  );
}

async function Precios() {
  await exigirPermiso("configuracion.editar");
  const temporada = await temporadaDelPanel();
  if (!temporada) return <SinTemporada />;
  const ocupados = await prisma.inscripcionNino.count({
    where: { estado: { not: "CANCELADO" }, inscripcion: { temporadaId: temporada.id } },
  });
  const opcionesActivas = temporada.semanas.filter((s) => s.activa).map(aOpcion);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Seccion
          titulo="Modo de la inscripción"
          ayuda="Define qué ve la familia en el formulario. Podés cambiarlo cuando quieras; no modifica a los ya inscriptos."
        >
          <FormAccion accion={guardarModoInscripcion.bind(null, temporada.id)} textoBoton="Guardar modo">
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Modo de la inscripción</legend>
              {(
                [
                  ["PREINSCRIPCION", "Preinscripción", "Sin precios ni totales. Las familias solo dejan sus datos y les escriben después."],
                  [
                    "INSCRIPCION",
                    "Inscripción con pago",
                    "Muestra precios y total, y al terminar el alias (de Mensajes de WhatsApp) con un botón para mandar el comprobante.",
                  ],
                ] as const
              ).map(([valor, nombre, descripcion]) => (
                <label key={valor} className="flex cursor-pointer gap-3 rounded-xl border-2 border-marino/15 p-3 has-[:checked]:border-marino has-[:checked]:bg-marino/5">
                  <input type="radio" name="modo" value={valor} defaultChecked={temporada.modoInscripcion === valor} className="mt-1 size-4 accent-marino" />
                  <span>
                    <span className="block font-semibold text-marino">{nombre}</span>
                    <span className="block text-xs text-texto/80">{descripcion}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </FormAccion>
        </Seccion>

        <Seccion
          titulo="Precio de cada opción"
          ayuda="Lo que cuesta cada quincena o semana por separado. Las fechas y el horario se cambian en Fechas y horarios."
        >
          {temporada.semanas.length === 0 ? (
            <p className="text-sm">
              Todavía no hay opciones.{" "}
              <Link href="/admin/colonia/fechas" className="font-semibold text-marino underline">
                Cargalas en Fechas y horarios
              </Link>
              .
            </p>
          ) : (
            <FormAccion accion={guardarPreciosOpciones.bind(null, temporada.id)} textoBoton="Guardar precios de las opciones">
              <ul className="divide-y divide-marino/10">
                {temporada.semanas.map((s) => {
                  const o = aOpcion(s);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                      <label htmlFor={`precio-opcion-${s.id}`} className="min-w-0 flex-1">
                        <span className="block font-semibold text-marino">
                          {o.nombre}
                          {!s.activa && <span className="ml-2 text-xs font-normal text-texto/70">(desactivada)</span>}
                        </span>
                        <span className="block text-xs text-texto/80">
                          {formatearFecha(o.fechaInicio)} al {formatearFecha(o.fechaFin)} · {textoHorario(o)}
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden className="text-sm text-texto/70">
                          $
                        </span>
                        <input
                          id={`precio-opcion-${s.id}`}
                          name={`precio-${s.id}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          defaultValue={s.precio}
                          required
                          className={`${claseInput} w-36 text-right tabular-nums`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </FormAccion>
          )}
        </Seccion>

        <Seccion titulo="Precios y descuentos" ayuda="Precios que no son de una opción en particular: colonia completa, días sueltos y descuento por hermanos.">
          <FormAccion accion={guardarPrecios.bind(null, temporada.id)} textoBoton="Guardar precios">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                nombre="precioColoniaCompleta"
                etiqueta="Precio colonia completa ($)"
                tipo="number"
                min={0}
                valor={temporada.precioColoniaCompleta}
                ayuda="Se cobra cuando un chico va a todas las opciones de su horario. Vacío = se suman los precios de cada opción."
              />
              <Campo
                nombre="descuentoHermanos"
                etiqueta="Descuento por hermanos (%)"
                tipo="number"
                min={0}
                max={100}
                valor={temporada.descuentoHermanos}
                requerido
                ayuda="Sobre el total de la familia con 2 o más chicos. Con 0 no hay descuento."
              />
              <div className="sm:col-span-2">
                <Casilla nombre="permitePorDia" etiqueta="Permitir inscribirse por días sueltos" marcada={temporada.permitePorDia} />
                <p className="mt-1 text-xs">Los días se eligen de lunes a viernes dentro de las fechas de las opciones activas.</p>
              </div>
              <Campo nombre="precioDia" etiqueta="Precio por día suelto ($)" tipo="number" min={0} valor={temporada.precioDia} ayuda="Vacío = a confirmar." />
            </div>
          </FormAccion>
        </Seccion>

        <Seccion
          titulo="Cupo"
          ayuda="Cantidad de lugares. Cada chico inscripto ocupa uno (los cancelados lo liberan). Al completarse, la inscripción se cierra sola."
        >
          <FormAccion accion={guardarCupo.bind(null, temporada.id)} textoBoton="Guardar cupo">
            <div className="flex flex-wrap items-end gap-4">
              <Campo nombre="cupo" etiqueta="Lugares en total" tipo="number" min={1} valor={temporada.cupo} className="w-40" idPrefijo="cupo" />
              <p className="pb-2 text-sm">
                Ocupados: <strong>{ocupados}</strong>
                {temporada.cupo !== null && (
                  <>
                    {" "}
                    · Quedan: <strong>{Math.max(0, temporada.cupo - ocupados)}</strong>
                  </>
                )}
              </p>
            </div>
            <p className="mt-1 text-xs">Dejalo vacío para no tener límite (y no mostrar el contador en la página de inicio).</p>
          </FormAccion>
        </Seccion>
      </div>

      <Seccion titulo="Así lo ve la familia" ayuda="Se actualiza al guardar." className="self-start xl:sticky xl:top-4">
        <VistaPrevia opciones={opcionesActivas} precios={preciosDe(temporada)} porDia={temporada.permitePorDia} />
      </Seccion>
    </div>
  );
}
