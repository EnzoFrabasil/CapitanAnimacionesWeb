import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { claseBoton } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { hoyEnArgentina } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import { elegirTemporadaPanel } from "../../acciones";
import { crearTemporada, guardarDatosTemporada } from "../acciones";

export default function PaginaTemporadas() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Temporadas"
        ayuda="Cada verano es una temporada, con sus fechas, precios, grupos e inscriptos. La que elegís arriba es la que se ve en todo el panel."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Temporadas />
      </Suspense>
    </div>
  );
}

async function Temporadas() {
  await exigirPermiso("configuracion.editar");
  const [actual, temporadas] = await Promise.all([
    temporadaDelPanel(),
    prisma.temporada.findMany({
      orderBy: [{ anio: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { inscripciones: true } } },
    }),
  ]);
  const anioSiguiente = hoyEnArgentina().getUTCFullYear() + 1;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {actual && (
        <Seccion titulo={`Nombre de la temporada que estás viendo`} ayuda="Es el nombre que ven las familias en el formulario.">
          <FormAccion accion={guardarDatosTemporada.bind(null, actual.id)} textoBoton="Guardar">
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo nombre="nombre" etiqueta="Nombre" valor={actual.nombre} requerido idPrefijo="temporada" className="sm:col-span-2" />
              <Campo nombre="anio" etiqueta="Año" tipo="number" valor={actual.anio} requerido idPrefijo="temporada" />
            </div>
          </FormAccion>
        </Seccion>
      )}

      <Seccion titulo="Nueva temporada" ayuda="Se crea con la inscripción cerrada. Después cargás fechas, precios y grupos, y la abrís desde la barra de arriba.">
        <FormAccion accion={crearTemporada} textoBoton="Crear temporada" textoPendiente="Creando…">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo nombre="nombre" etiqueta="Nombre" valor={`Colonia de verano ${anioSiguiente}`} requerido idPrefijo="nueva" className="sm:col-span-2" />
            <Campo nombre="anio" etiqueta="Año" tipo="number" valor={anioSiguiente} requerido idPrefijo="nueva" />
          </div>
        </FormAccion>
      </Seccion>

      <Seccion titulo="Todas las temporadas" className="lg:col-span-2">
        {temporadas.length === 0 ? (
          <p className="text-sm">Todavía no hay temporadas.</p>
        ) : (
          <ul className="divide-y divide-marino/10">
            {temporadas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <span className="font-medium">{t.nombre}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={`size-2 rounded-full ${t.inscripcionAbierta ? "bg-verde" : "bg-marino/30"}`} />
                  {t.inscripcionAbierta ? "Inscripción abierta" : "Cerrada"}
                </span>
                <span className="text-texto/70">{t._count.inscripciones} inscripciones</span>
                {actual?.id === t.id ? (
                  <span className="ml-auto rounded-full bg-marino/10 px-2 py-0.5 text-xs font-semibold text-marino">La estás viendo</span>
                ) : (
                  <form action={elegirTemporadaPanel.bind(null, t.id)} className="ml-auto">
                    <button type="submit" className={claseBoton.secundario}>
                      Ver esta temporada
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  );
}
