import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Campo, Selector } from "@/components/admin/Campo";
import { claseEtiqueta, claseInput, claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { InsigniaDuplicado, InsigniaEstado, InsigniaSinGrupo } from "@/components/admin/Insignias";
import { IconoWhatsapp } from "@/components/marca/iconos";
import { exigirAdmin } from "@/lib/auth/admin";
import { fechaAIso } from "@/lib/dominio/fechas";
import { ETIQUETA_ESTADO, formatearFechaHora, formatearWhatsapp } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import {
  actualizarInscripcion,
  actualizarNino,
  actualizarResponsable,
  agregarResponsable,
  hacerPrincipal,
  moverAFamilia,
  quitarResponsable,
  unirFamilias,
} from "./acciones";
import { EditorAsistencia } from "./EditorAsistencia";

export default function PaginaInscripto({ params }: PageProps<"/admin/inscriptos/[id]">) {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Detalle params={params} />
    </Suspense>
  );
}

async function buscar(id: number) {
  return prisma.inscripcionNino.findUnique({
    where: { id },
    include: {
      grupoEdad: true,
      semanas: true,
      dias: { orderBy: { fecha: "asc" } },
      inscripcion: {
        include: {
          temporada: { include: { semanas: { orderBy: { numero: "asc" } }, gruposEdad: { orderBy: { edadMin: "asc" } } } },
        },
      },
      nino: {
        include: {
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            include: { responsable: { include: { _count: { select: { ninos: true } } } } },
          },
          familia: {
            include: {
              ninos: {
                orderBy: { createdAt: "asc" },
                include: { inscripciones: { select: { id: true }, orderBy: { id: "desc" }, take: 1 } },
              },
            },
          },
          inscripciones: {
            where: { id: { not: id } },
            include: { inscripcion: { include: { temporada: { select: { nombre: true } } } } },
          },
        },
      },
    },
  });
}

function Seccion({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  const id = `seccion-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`${claseTarjeta} ${className}`}>
      <h2 id={id} className="mb-4 text-lg font-semibold text-marino">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

async function Detalle({ params }: Pick<PageProps<"/admin/inscriptos/[id]">, "params">) {
  await exigirAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const f = await buscar(id);
  if (!f) notFound();

  const { nino, inscripcion } = f;
  const temporada = inscripcion.temporada;
  const hermanos = nino.familia.ninos.filter((n) => n.id !== nino.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin?temporada=${temporada.id}`} className="text-sm font-semibold text-marino underline">
          ← Inscriptos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-titulo text-3xl font-bold text-marino">
            {nino.nombre} {nino.apellido}
          </h1>
          <InsigniaEstado estado={f.estado} />
          {f.posibleDuplicado && <InsigniaDuplicado />}
          {!f.grupoEdad && <InsigniaSinGrupo />}
        </div>
        <p className="mt-1 text-sm">
          Inscripción N.º {inscripcion.numero} · alta {formatearFechaHora(inscripcion.fechaAlta)} · {temporada.nombre} ·{" "}
          {f.edadAlInscribir} años al inscribirse · familia #{nino.familiaId}
        </p>
        <p className="mt-1 text-sm">
          {inscripcion.privacidadAceptadaEn
            ? `Aceptó el uso de datos el ${formatearFechaHora(inscripcion.privacidadAceptadaEn)} (versión ${inscripcion.privacidadVersion})`
            : "Inscripción anterior a la casilla de aceptación de datos"}
        </p>
        {nino.inscripciones.length > 0 && (
          <p className="mt-1 text-sm">
            Otras inscripciones de este niño/a:{" "}
            {nino.inscripciones.map((o, i) => (
              <span key={o.id}>
                {i > 0 && ", "}
                <Link href={`/admin/inscriptos/${o.id}`} className="font-semibold text-marino underline">
                  N.º {o.inscripcion.numero} ({o.inscripcion.temporada.nombre})
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Datos del niño/a">
          <FormAccion accion={actualizarNino.bind(null, nino.id)} textoBoton="Guardar datos">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo nombre="nombre" etiqueta="Nombre" valor={nino.nombre} requerido idPrefijo="nino" />
              <Campo nombre="apellido" etiqueta="Apellido" valor={nino.apellido} requerido idPrefijo="nino" />
              <Campo nombre="dni" etiqueta="Documento" valor={nino.dni} requerido idPrefijo="nino" />
              <Campo
                nombre="fechaNacimiento"
                etiqueta="Fecha de nacimiento"
                tipo="date"
                valor={fechaAIso(nino.fechaNacimiento)}
                requerido
                idPrefijo="nino"
                ayuda="Cambiarla no recalcula la edad al inscribirse ni el grupo."
              />
              <div className="sm:col-span-2">
                <label htmlFor="nino-infoAdicional" className={claseEtiqueta}>
                  Información adicional (alergias, medicación, etc.)
                </label>
                <textarea id="nino-infoAdicional" name="infoAdicional" rows={4} defaultValue={nino.infoAdicional ?? ""} className={claseInput} />
              </div>
            </div>
          </FormAccion>
        </Seccion>

        <Seccion titulo="Inscripción">
          <FormAccion accion={actualizarInscripcion.bind(null, f.id)} textoBoton="Guardar inscripción">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                nombre="estado"
                etiqueta="Estado"
                valor={f.estado}
                idPrefijo="insc"
                opciones={Object.entries(ETIQUETA_ESTADO).map(([valor, texto]) => ({ valor, texto }))}
              />
              <Selector
                nombre="grupoEdadId"
                etiqueta="Grupo"
                valor={f.grupoEdadId ?? ""}
                idPrefijo="insc"
                opciones={[
                  { valor: "", texto: "Sin grupo" },
                  ...temporada.gruposEdad.map((g) => ({ valor: g.id, texto: `${g.nombre} (${g.edadMin} a ${g.edadMax})` })),
                ]}
              />
              <Selector
                nombre="turno"
                etiqueta="Turno"
                valor={f.turno}
                idPrefijo="insc"
                opciones={[
                  { valor: "MANANA", texto: "Mañana" },
                  { valor: "TARDE", texto: "Tarde" },
                ]}
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 py-2 text-sm font-medium text-marino">
                  <input type="checkbox" name="posibleDuplicado" defaultChecked={f.posibleDuplicado} className="size-4 accent-marino" />
                  Marcar como posible duplicado
                </label>
              </div>
              <EditorAsistencia
                modalidad={f.modalidad}
                semanas={temporada.semanas.map((s) => ({
                  id: s.id,
                  numero: s.numero,
                  fechaInicio: fechaAIso(s.fechaInicio),
                  fechaFin: fechaAIso(s.fechaFin),
                }))}
                semanasElegidas={f.semanas.map((s) => s.semanaId)}
                diasElegidos={f.dias.map((d) => fechaAIso(d.fecha))}
              />
              <div className="sm:col-span-2">
                <label htmlFor="insc-notasAdmin" className={claseEtiqueta}>
                  Notas internas
                </label>
                <textarea id="insc-notasAdmin" name="notasAdmin" rows={3} defaultValue={f.notasAdmin ?? ""} className={claseInput} />
              </div>
            </div>
          </FormAccion>
        </Seccion>
      </div>

      <Seccion titulo="Contactos">
        <div className="space-y-4">
          {nino.responsables.map((v) => {
            const r = v.responsable;
            const prefijo = `resp-${r.id}`;
            return (
              <div key={r.id} className="rounded-xl border border-marino/10 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-marino">
                    {r.nombre} {r.apellido}
                    {v.esPrincipal && <span className="ml-2 rounded-full bg-amarillo px-2 py-0.5 text-xs">Principal</span>}
                  </p>
                  <a
                    href={`https://wa.me/${r.whatsapp.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-verde/50 px-3 py-1 text-sm font-semibold text-marino hover:bg-verde/10"
                  >
                    <IconoWhatsapp className="size-4" /> {formatearWhatsapp(r.whatsapp)}
                  </a>
                </div>
                {r._count.ninos > 1 && (
                  <p className="mb-3 rounded-lg bg-amarillo/20 px-3 py-2 text-xs text-marino">
                    Este contacto está vinculado a {r._count.ninos} niños: los cambios en sus datos (salvo el parentesco) se
                    aplican a todos.
                  </p>
                )}
                <FormAccion accion={actualizarResponsable.bind(null, nino.id, r.id)} textoBoton="Guardar contacto" variante="secundario">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Campo nombre="nombre" etiqueta="Nombre" valor={r.nombre} requerido idPrefijo={prefijo} />
                    <Campo nombre="apellido" etiqueta="Apellido" valor={r.apellido} requerido idPrefijo={prefijo} />
                    <Campo nombre="parentesco" etiqueta="Vínculo con este niño/a (opcional)" valor={v.parentesco} idPrefijo={prefijo} />
                    <Campo nombre="whatsapp" etiqueta="WhatsApp" tipo="tel" valor={r.whatsapp} requerido idPrefijo={prefijo} />
                    <Campo nombre="whatsappAlt" etiqueta="WhatsApp alternativo" tipo="tel" valor={r.whatsappAlt} idPrefijo={prefijo} />
                    <Campo nombre="email" etiqueta="Email" tipo="email" valor={r.email} idPrefijo={prefijo} />
                    <Campo nombre="dni" etiqueta="Documento" valor={r.dni} idPrefijo={prefijo} />
                  </div>
                </FormAccion>
                <div className="mt-3 flex flex-wrap gap-3 border-t border-marino/10 pt-3">
                  {!v.esPrincipal && (
                    <FormAccion accion={hacerPrincipal.bind(null, nino.id, r.id)} textoBoton="Hacer principal" textoPendiente="Cambiando…" variante="secundario" />
                  )}
                  {nino.responsables.length > 1 && (
                    <FormAccion accion={quitarResponsable.bind(null, nino.id, r.id)} textoBoton="Quitar de este niño/a" textoPendiente="Quitando…" variante="peligro" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <details className="mt-4 rounded-xl border border-dashed border-marino/30 p-4">
          <summary className="cursor-pointer font-semibold text-marino">+ Agregar contacto</summary>
          <p className="mt-2 text-xs">Si el WhatsApp ya existe, se vincula ese contacto sin modificar sus datos.</p>
          <FormAccion accion={agregarResponsable.bind(null, nino.id)} textoBoton="Agregar contacto" className="mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo nombre="nombre" etiqueta="Nombre" requerido idPrefijo="nuevo" />
              <Campo nombre="apellido" etiqueta="Apellido" requerido idPrefijo="nuevo" />
              <Campo nombre="parentesco" etiqueta="Vínculo (opcional)" idPrefijo="nuevo" />
              <Campo nombre="whatsapp" etiqueta="WhatsApp" tipo="tel" requerido idPrefijo="nuevo" />
              <Campo nombre="whatsappAlt" etiqueta="WhatsApp alternativo" tipo="tel" idPrefijo="nuevo" />
              <Campo nombre="email" etiqueta="Email" tipo="email" idPrefijo="nuevo" />
            </div>
          </FormAccion>
        </details>
      </Seccion>

      <Seccion titulo={`Familia #${nino.familiaId}`}>
        {hermanos.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {hermanos.map((h) => (
              <li key={h.id}>
                {h.inscripciones[0] ? (
                  <Link href={`/admin/inscriptos/${h.inscripciones[0].id}`} className="font-semibold text-marino underline">
                    {h.nombre} {h.apellido}
                  </Link>
                ) : (
                  `${h.nombre} ${h.apellido}`
                )}{" "}
                · DNI {h.dni}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm">No hay otros niños en esta familia.</p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <FormAccion accion={moverAFamilia.bind(null, nino.id)} textoBoton="Mover" textoPendiente="Moviendo…" variante="secundario">
            <Campo
              nombre="familiaId"
              etiqueta="Mover este niño/a a otra familia"
              idPrefijo="mover"
              ayuda='Número de familia (por ejemplo 12) o "nueva" para separarlo en una familia nueva.'
            />
          </FormAccion>
          <FormAccion accion={unirFamilias.bind(null, nino.familiaId)} textoBoton="Unir familias" textoPendiente="Uniendo…" variante="peligro">
            <Campo
              nombre="otraFamiliaId"
              etiqueta={`Unir otra familia a la #${nino.familiaId}`}
              idPrefijo="unir"
              ayuda="Todos los niños e inscripciones de la otra familia pasan a esta, y la otra se elimina."
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmar" className="size-4 accent-marino" /> Confirmo que quiero unirlas
            </label>
          </FormAccion>
        </div>
      </Seccion>
    </div>
  );
}
