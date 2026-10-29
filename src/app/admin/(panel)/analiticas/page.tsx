import Link from "next/link";
import { Suspense } from "react";
import { claseTarjeta } from "@/components/admin/estilos";
import { EncabezadoPagina } from "@/components/admin/Seccion";
import { BarrasPorEstado, ColumnasPorDia, Leyenda } from "@/components/admin/Graficos";
import { analiticasDeTemporada } from "@/lib/admin/analiticas";
import { temporadaDelPanel } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { formatearPrecio } from "@/lib/dominio/opciones";

export default function PaginaAnaliticas() {
  return (
    <Suspense fallback={<p className="py-12 text-center">Cargando analíticas…</p>}>
      <Analiticas />
    </Suspense>
  );
}

function Tarjeta({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  const id = `tarjeta-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`${claseTarjeta} ${className}`}>
      <h2 id={id} className="mb-3 text-sm font-semibold text-marino">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Punto({ clase }: { clase: string }) {
  return <span aria-hidden className={`inline-block size-2.5 rounded-sm ${clase}`} />;
}

async function Analiticas() {
  await exigirPermiso("analiticas.ver");
  // La temporada es la elegida en la barra de arriba.
  const temporada = await temporadaDelPanel();
  if (!temporada) return <p className="py-12 text-center">Todavía no hay temporadas.</p>;

  const a = await analiticasDeTemporada(temporada);
  const total = a.dinero.confirmado + a.dinero.pendiente;
  const porcentajeCupo = a.cupo ? Math.min(100, Math.round((a.cupo.ocupados / a.cupo.total) * 100)) : 0;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Analíticas"
        ayuda="Un resumen de la temporada elegida arriba: cuántos chicos hay, cuánta plata representa y cómo se reparten."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Chicos inscriptos">
          <p className="text-4xl font-semibold text-marino">{a.ninos.activos}</p>
          <ul className="mt-2 space-y-0.5 text-sm">
            <li className="flex items-center gap-2">
              <Punto clase="bg-grafico-confirmado" /> {a.ninos.confirmados} {a.ninos.confirmados === 1 ? "confirmado" : "confirmados"}
            </li>
            <li className="flex items-center gap-2">
              <Punto clase="bg-grafico-espera" /> {a.ninos.enEspera} en espera
            </li>
            {a.ninos.cancelados > 0 && (
              <li className="text-texto/70">
                {a.ninos.cancelados} {a.ninos.cancelados === 1 ? "cancelado" : "cancelados"} (no cuentan)
              </li>
            )}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Familias">
          <p className="text-4xl font-semibold text-marino">{a.familias}</p>
          <p className="mt-2 text-sm text-texto/80">Con al menos un chico activo en la temporada.</p>
        </Tarjeta>

        <Tarjeta titulo="Cupo" className="sm:col-span-2">
          {a.cupo ? (
            <>
              <p className="text-sm">
                <span className="text-4xl font-semibold text-marino">{a.cupo.ocupados}</span> de {a.cupo.total} lugares ocupados ·{" "}
                <strong>{a.cupo.quedan === 0 ? "cupo completo" : `quedan ${a.cupo.quedan}`}</strong>
              </p>
              <div
                role="meter"
                aria-label="Cupo ocupado"
                aria-valuemin={0}
                aria-valuemax={a.cupo.total}
                aria-valuenow={a.cupo.ocupados}
                className="mt-3 h-3 overflow-hidden rounded-full bg-marino/10"
              >
                <div
                  className={`h-full rounded-full ${porcentajeCupo >= 100 ? "bg-rojo" : porcentajeCupo >= 85 ? "bg-grafico-espera" : "bg-marino"}`}
                  style={{ width: `${porcentajeCupo}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-texto/80">{porcentajeCupo}% ocupado (los cancelados liberan su lugar).</p>
            </>
          ) : (
            <p className="text-sm">
              La temporada no tiene cupo cargado.{" "}
              <Link href={`/admin/configuracion/${temporada.id}`} className="font-semibold text-marino underline">
                Cargalo en Configuración
              </Link>
              .
            </p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Dinero estimado">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div>
            <p className="text-5xl font-semibold text-marino tabular-nums">{formatearPrecio(total)}</p>
            <p className="mt-1 text-sm text-texto/80">Total si pagan todos los inscriptos activos</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-grafico-confirmado/10 p-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-marino">
                <Punto clase="bg-grafico-confirmado" /> Confirmado
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-marino tabular-nums">{formatearPrecio(a.dinero.confirmado)}</dd>
            </div>
            <div className="rounded-xl bg-grafico-espera/10 p-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-marino">
                <Punto clase="bg-grafico-espera" /> Pendiente (en espera)
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-marino tabular-nums">{formatearPrecio(a.dinero.pendiente)}</dd>
            </div>
            <div className="rounded-xl bg-marino/5 p-3">
              <dt className="text-sm font-medium text-marino">Descuento por hermanos</dt>
              <dd className="mt-1 text-2xl font-semibold text-marino tabular-nums">−{formatearPrecio(a.dinero.descuentos)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 text-xs text-texto/80">
          Calculado con los precios de la temporada y el descuento por hermanos ya restado. Todavía no se registran pagos:
          &quot;confirmado&quot; es lo que corresponde a los chicos confirmados.
          {a.dinero.aConfirmar > 0 &&
            ` ${a.dinero.aConfirmar} ${a.dinero.aConfirmar === 1 ? "chico va" : "chicos van"} por días sueltos sin precio por día y no ${a.dinero.aConfirmar === 1 ? "suma" : "suman"}.`}
        </p>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Chicos por grupo">
          <div className="mb-3">
            <Leyenda />
          </div>
          <BarrasPorEstado titulo="Chicos por grupo" filas={a.grupos} />
        </Tarjeta>

        <Tarjeta titulo="Por opción y horario">
          <div className="mb-3">
            <Leyenda />
          </div>
          {a.horarios.length === 0 ? (
            <p className="text-sm">No hay opciones cargadas.</p>
          ) : (
            <div className="space-y-5">
              {a.horarios.map((h) => (
                <div key={h.texto}>
                  <h3 className="mb-2 text-sm font-semibold text-texto">
                    Horario {h.texto} · {h.total} {h.total === 1 ? "chico" : "chicos"}
                  </h3>
                  <BarrasPorEstado titulo={`Horario ${h.texto}`} filas={h.filas} />
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-texto/80">
            &quot;Colonia completa&quot; son los que eligieron todas las opciones del horario; no se cuentan otra vez en cada opción.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Inscripciones por día">
        {a.porDia.length === 0 ? (
          <p className="text-sm">Todavía no hay inscripciones.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-texto/80">Chicos anotados cada día (incluye los que después se cancelaron).</p>
            <ColumnasPorDia titulo="Inscripciones por día" dias={a.porDia} />
          </>
        )}
      </Tarjeta>
    </div>
  );
}
