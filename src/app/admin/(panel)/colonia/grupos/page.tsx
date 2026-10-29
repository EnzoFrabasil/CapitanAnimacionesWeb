import { Suspense } from "react";
import { Campo } from "@/components/admin/Campo";
import { FormAccion } from "@/components/admin/FormAccion";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { asignarSinGrupo, guardarEdades, guardarGrupos } from "../acciones";
import { EditorGrupos } from "../EditorGrupos";
import { SinTemporada } from "../SinTemporada";

export default function PaginaGrupos() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Grupos y edades"
        ayuda="Qué edades pueden inscribirse y en qué grupo queda cada chico según su edad."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Grupos />
      </Suspense>
    </div>
  );
}

async function Grupos() {
  await exigirPermiso("configuracion.editar");
  const temporada = await temporadaDelPanel();
  if (!temporada) return <SinTemporada />;
  const sinGrupo = await prisma.inscripcionNino.count({ where: { grupoEdadId: null, inscripcion: { temporadaId: temporada.id } } });

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Seccion titulo="Edades permitidas" ayuda="Años cumplidos al inscribirse, incluidos los dos extremos. Fuera de ese rango el formulario no deja inscribir." className="self-start">
        <FormAccion accion={guardarEdades.bind(null, temporada.id)} textoBoton="Guardar edades">
          <div className="grid grid-cols-2 gap-3">
            <Campo nombre="edadMinima" etiqueta="Desde (años)" tipo="number" min={0} max={25} valor={temporada.edadMinima} requerido idPrefijo="edades" />
            <Campo nombre="edadMaxima" etiqueta="Hasta (años)" tipo="number" min={0} max={25} valor={temporada.edadMaxima} requerido idPrefijo="edades" />
          </div>
        </FormAccion>
      </Seccion>

      <Seccion titulo="Grupos de edad" ayuda="Cada chico entra al grupo que corresponde a su edad al inscribirse. Cambiar los grupos no mueve a los ya inscriptos.">
        <EditorGrupos
          accion={guardarGrupos.bind(null, temporada.id)}
          grupos={temporada.gruposEdad.map(({ id, nombre, edadMin, edadMax, enlaceWhatsapp }) => ({ id, nombre, edadMin, edadMax, enlaceWhatsapp }))}
        />
        <div className="mt-5 border-t border-marino/10 pt-4">
          <p className="text-sm">
            Chicos sin grupo en esta temporada: <strong>{sinGrupo}</strong>
          </p>
          {sinGrupo > 0 && (
            <FormAccion
              accion={asignarSinGrupo.bind(null, temporada.id)}
              textoBoton="Asignar grupo a los chicos sin grupo"
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
