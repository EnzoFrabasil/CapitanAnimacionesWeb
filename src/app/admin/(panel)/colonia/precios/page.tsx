import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { FormAccion } from "@/components/admin/FormAccion";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { aOpcion, preciosDe } from "@/lib/temporada";
import { guardarCupo, guardarPrecios } from "../acciones";
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

        <Seccion titulo="Precios y descuentos" ayuda="El precio de cada quincena o semana se carga en Fechas y horarios.">
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
      </div>

      <Seccion titulo="Así lo ve la familia" ayuda="Se actualiza al guardar." className="self-start xl:sticky xl:top-4">
        <VistaPrevia opciones={opcionesActivas} precios={preciosDe(temporada)} porDia={temporada.permitePorDia} />
      </Seccion>
    </div>
  );
}
