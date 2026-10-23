import Link from "next/link";
import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { exigirAdmin } from "@/lib/auth/admin";
import { hoyEnArgentina } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import { crearTemporada } from "./acciones";

export default function PaginaConfiguracion() {
  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-3xl font-bold text-marino">Configuración</h1>
      <Suspense fallback={<p>Cargando temporadas…</p>}>
        <Temporadas />
      </Suspense>
    </div>
  );
}

async function Temporadas() {
  await exigirAdmin();
  const temporadas = await prisma.temporada.findMany({
    orderBy: [{ anio: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { semanas: true, gruposEdad: true, inscripciones: true } } },
  });
  const anioSiguiente = hoyEnArgentina().getUTCFullYear() + 1;

  return (
    <>
      <section aria-labelledby="temporadas-titulo" className={claseTarjeta}>
        <h2 id="temporadas-titulo" className="mb-3 text-lg font-semibold text-marino">
          Temporadas
        </h2>
        {temporadas.length === 0 ? (
          <p className="text-sm">Todavía no hay temporadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs text-marino uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3">Nombre</th>
                  <th scope="col" className="py-2 pr-3">Año</th>
                  <th scope="col" className="py-2 pr-3">Inscripción</th>
                  <th scope="col" className="py-2 pr-3">Semanas</th>
                  <th scope="col" className="py-2 pr-3">Grupos</th>
                  <th scope="col" className="py-2 pr-3">Inscripciones</th>
                  <th scope="col" className="py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marino/10">
                {temporadas.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 font-medium">{t.nombre}</td>
                    <td className="py-2 pr-3">{t.anio}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className={`size-2 rounded-full ${t.inscripcionAbierta ? "bg-verde" : "bg-marino/30"}`} />
                        {t.inscripcionAbierta ? "Abierta" : "Cerrada"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{t._count.semanas}</td>
                    <td className="py-2 pr-3">{t._count.gruposEdad}</td>
                    <td className="py-2 pr-3">{t._count.inscripciones}</td>
                    <td className="py-2 text-right">
                      <Link href={`/admin/configuracion/${t.id}`} className="font-semibold text-marino underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="nueva-temporada" className={claseTarjeta}>
        <h2 id="nueva-temporada" className="mb-3 text-lg font-semibold text-marino">
          Nueva temporada
        </h2>
        <FormAccion accion={crearTemporada} textoBoton="Crear temporada" textoPendiente="Creando…">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo nombre="nombre" etiqueta="Nombre" valor={`Colonia de verano ${anioSiguiente}`} requerido idPrefijo="nueva" className="sm:col-span-2" />
            <Campo nombre="anio" etiqueta="Año" tipo="number" valor={anioSiguiente} requerido idPrefijo="nueva" />
          </div>
          <p className="mt-2 text-xs">Se crea con la inscripción cerrada. Después cargás semanas y grupos, y la abrís.</p>
        </FormAccion>
      </section>
    </>
  );
}
