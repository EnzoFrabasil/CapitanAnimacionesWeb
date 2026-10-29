import Link from "next/link";
import { Suspense } from "react";
import { claseBoton, claseEtiqueta, claseInput, claseTarjeta } from "@/components/admin/estilos";
import { exigirPermiso } from "@/lib/auth/usuario";
import { formatearFechaHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { GRUPOS_REGISTRO, accionesDelGrupo, textoAccion } from "@/lib/registro/etiquetas";

const POR_PAGINA = 100;

export default function PaginaRegistro({ searchParams }: PageProps<"/admin/registro">) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-titulo text-3xl font-bold text-marino">Registro de cambios</h1>
        <p className="text-sm">Todo lo que se hace en el panel: quién, cuándo, desde qué IP y qué cambió. No se puede editar ni borrar.</p>
      </div>
      <Suspense fallback={<p>Cargando registro…</p>}>
        <Registro searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Cambio = { antes: unknown; despues: unknown };
const esCambios = (v: unknown): v is Record<string, Cambio> =>
  !!v && typeof v === "object" && Object.values(v).every((c) => !!c && typeof c === "object" && "antes" in c && "despues" in c);

const mostrar = (v: unknown) => (v === null || v === undefined || v === "" ? "(vacío)" : typeof v === "string" ? v : JSON.stringify(v));

/** El detalle en forma legible: los cambios como "campo: antes → después" y el resto como lista. */
function Detalle({ detalle }: { detalle: unknown }) {
  if (detalle === null || detalle === undefined) return null;
  if (typeof detalle !== "object" || Array.isArray(detalle)) return <span>{mostrar(detalle)}</span>;
  return (
    <dl className="space-y-0.5">
      {Object.entries(detalle).map(([clave, valor]) =>
        clave === "cambios" && esCambios(valor) ? (
          Object.keys(valor).length === 0 ? (
            <div key={clave} className="text-texto/70">
              Sin cambios
            </div>
          ) : (
            Object.entries(valor).map(([campo, c]) => (
              <div key={campo}>
                <dt className="inline font-medium">{campo}: </dt>
                <dd className="inline">
                  <span className="text-rojo line-through decoration-rojo/40">{mostrar(c.antes)}</span> →{" "}
                  <span className="text-verde">{mostrar(c.despues)}</span>
                </dd>
              </div>
            ))
          )
        ) : (
          <div key={clave}>
            <dt className="inline font-medium">{clave}: </dt>
            <dd className="inline break-words">
              {Array.isArray(valor) && valor.every((x) => typeof x === "string") ? valor.join(" · ") : mostrar(valor)}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}

async function Registro({ searchParams }: Pick<PageProps<"/admin/registro">, "searchParams">) {
  await exigirPermiso("registro.ver");
  const params = await searchParams;
  const texto = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const usuarioId = Number(texto("usuario")) || undefined;
  const grupo = GRUPOS_REGISTRO.includes(texto("tipo")) ? texto("tipo") : "";
  const pagina = Math.max(1, Number(texto("pagina")) || 1);

  const where = {
    ...(usuarioId ? { usuarioId } : {}),
    ...(grupo ? { accion: { in: accionesDelGrupo(grupo) } } : {}),
  };
  const [usuarios, eventos, total] = await Promise.all([
    prisma.usuario.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, email: true } }),
    prisma.registro.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { usuario: { select: { nombre: true } } },
    }),
    prisma.registro.count({ where }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (p: number) => `/admin/registro?${new URLSearchParams({ ...(usuarioId ? { usuario: String(usuarioId) } : {}), ...(grupo ? { tipo: grupo } : {}), pagina: String(p) })}`;

  return (
    <>
      <form className={`${claseTarjeta} flex flex-wrap items-end gap-3`}>
        <div>
          <label htmlFor="filtro-usuario" className={claseEtiqueta}>
            Persona
          </label>
          <select id="filtro-usuario" name="usuario" defaultValue={usuarioId ?? ""} className={claseInput}>
            <option value="">Todas</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-tipo" className={claseEtiqueta}>
            Tipo
          </label>
          <select id="filtro-tipo" name="tipo" defaultValue={grupo} className={claseInput}>
            <option value="">Todos</option>
            {GRUPOS_REGISTRO.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={claseBoton.secundario}>
          Filtrar
        </button>
        {(usuarioId || grupo) && (
          <Link href="/admin/registro" className="pb-2 text-sm font-semibold text-marino underline">
            Limpiar
          </Link>
        )}
      </form>

      <p className="text-sm">
        {total} {total === 1 ? "evento" : "eventos"}
        {paginas > 1 && ` · página ${pagina} de ${paginas}`}
      </p>

      {eventos.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-marino/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-marino/5 text-xs tracking-wide text-marino uppercase">
              <tr>
                <th scope="col" className="px-3 py-3">Fecha</th>
                <th scope="col" className="px-3 py-3">Quién</th>
                <th scope="col" className="px-3 py-3">Qué hizo</th>
                <th scope="col" className="px-3 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marino/10 align-top">
              {eventos.map((e) => (
                <tr key={e.id} className={e.accion.startsWith("login.fallido") || e.accion === "login.bloqueado" ? "bg-rojo/5" : ""}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatearFechaHora(e.fecha)}
                    {e.ip && <div className="text-xs text-texto/60">IP {e.ip}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {e.usuario?.nombre ?? (
                      <span className="text-texto/70">
                        {e.usuarioEmail ?? (e.accion.startsWith("login.") ? "Sin sesión" : "Desde la terminal")}
                      </span>
                    )}
                    {e.usuario && <div className="text-xs text-texto/60">{e.usuarioEmail}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {textoAccion(e.accion)}
                    {e.entidad && (
                      <div className="text-xs text-texto/60">
                        {e.entidad}
                        {e.entidadId && ` ${e.entidadId}`}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xl px-3 py-2 text-xs">
                    <Detalle detalle={e.detalle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas del registro" className="flex gap-3 text-sm">
          {pagina > 1 && (
            <Link href={enlace(pagina - 1)} className="font-semibold text-marino underline">
              ← Más nuevos
            </Link>
          )}
          {pagina < paginas && (
            <Link href={enlace(pagina + 1)} className="font-semibold text-marino underline">
              Más viejos →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
