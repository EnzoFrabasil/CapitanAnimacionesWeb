import Link from "next/link";
import { cambiarInscripcion } from "@/app/admin/(panel)/colonia/acciones";
import { listarTemporadas } from "@/lib/admin/consultas";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import type { Permiso } from "@/lib/auth/permisos";
import { usuarioActual } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { FormAccion } from "./FormAccion";
import { SelectorTemporada } from "./SelectorTemporada";

/** Solo se muestra a quien ve algo que depende de la temporada. */
const PERMISOS_CON_TEMPORADA: Permiso[] = ["inscriptos.ver", "analiticas.ver", "configuracion.editar"];

/**
 * Barra debajo del menú: qué temporada se está mirando y si la inscripción
 * está abierta, con el botón para abrirla o cerrarla (si el rol lo permite).
 */
export async function BarraTemporada() {
  const usuario = await usuarioActual();
  if (!usuario || usuario.debeCambiarPassword) return null;
  if (!PERMISOS_CON_TEMPORADA.some((p) => usuario.permisos.has(p))) return null;

  const [temporada, temporadas] = await Promise.all([temporadaDelPanel(), listarTemporadas()]);
  const puedeConfigurar = usuario.permisos.has("configuracion.editar");
  if (!temporada) {
    return (
      <Contenedor>
        <p className="text-sm">
          Todavía no hay ninguna temporada.{" "}
          {puedeConfigurar && (
            <Link href="/admin/colonia/temporadas" className="font-semibold text-marino underline">
              Crear la primera
            </Link>
          )}
        </p>
      </Contenedor>
    );
  }
  const ocupados = await prisma.inscripcionNino.count({
    where: { estado: { not: "CANCELADO" }, inscripcion: { temporadaId: temporada.id } },
  });
  const abierta = temporada.inscripcionAbierta;

  return (
    <Contenedor>
      <SelectorTemporada actual={temporada.id} temporadas={temporadas.map((t) => ({ id: t.id, nombre: t.nombre }))} />
      <p className="flex items-center gap-2 text-sm">
        <span aria-hidden className={`size-2.5 rounded-full ${abierta ? "bg-verde" : "bg-marino/30"}`} />
        <span>
          {temporada.modoInscripcion === "INSCRIPCION" ? "Inscripción" : "Preinscripción"} <strong>{abierta ? "abierta" : "cerrada"}</strong>
          {temporada.cupo !== null ? (
            <>
              {" "}
              · {ocupados} de {temporada.cupo} lugares
            </>
          ) : (
            <> · {ocupados} inscriptos</>
          )}
        </span>
      </p>
      {puedeConfigurar && (
        <FormAccion
          accion={cambiarInscripcion.bind(null, temporada.id, !abierta)}
          textoBoton={abierta ? "Cerrar inscripción" : "Abrir inscripción"}
          textoPendiente={abierta ? "Cerrando…" : "Abriendo…"}
          variante={abierta ? "peligro" : "secundario"}
          className="ml-auto"
        />
      )}
    </Contenedor>
  );
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-marino/10 bg-crema/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">{children}</div>
    </div>
  );
}
