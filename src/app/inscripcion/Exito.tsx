import Image from "next/image";
import Link from "next/link";
import { IconoWhatsapp } from "@/components/marca/iconos";
import { sitio } from "@/config/sitio";
import { enlaceWhatsapp, listaNombres } from "@/lib/dominio/mensajes";
import { formatearPrecio, type TotalFamilia } from "@/lib/dominio/opciones";

interface Pago {
  /** Alias, CBU, titular (Mensajes de WhatsApp → Datos de pago). */
  datosPago: string;
  /** WhatsApp de la colonia (el de la página de inicio), sin "+". */
  whatsapp: string;
  total: TotalFamilia;
  chicos: string[];
  nombreTemporada: string;
}

export function Exito({ numero, titulo, texto, pago }: { numero: number; titulo: string; texto: string; pago: Pago | null }) {
  const mensajeComprobante = pago
    ? `¡Hola! Te envío el comprobante de pago de la inscripción N.º ${numero} de ${listaNombres(pago.chicos)} a la ${pago.nombreTemporada}. Total: ${formatearPrecio(pago.total.total)}.`
    : "";

  return (
    <section className="animate-aparecer rounded-3xl bg-white p-6 text-center shadow-md sm:p-10" aria-live="polite">
      <Image
        src={sitio.logos.capitanColgado}
        alt=""
        width={2213}
        height={1669}
        className="mx-auto h-56 w-auto animate-balanceo sm:h-72"
      />
      <h1 className="mt-6 font-titulo text-3xl font-bold text-marino sm:text-4xl">{titulo}</h1>
      <p className="mt-4 text-lg">Tu número de inscripción es</p>
      <p className="mt-1 font-titulo text-5xl font-bold text-marino">N.º {numero}</p>
      {texto && <p className="mx-auto mt-6 max-w-md whitespace-pre-line">{texto}</p>}

      {pago && (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-marino bg-crema/60 p-5 text-left shadow-[0_4px_0_0_#093651]">
          <h2 className="font-titulo text-xl font-semibold text-marino">Para confirmar el lugar</h2>
          <p className="mt-2 text-sm">
            Transferí el total y mandanos el comprobante por WhatsApp. Cuando lo recibamos, la inscripción queda confirmada.
          </p>
          <dl className="mt-4 space-y-1">
            {pago.total.descuento > 0 && (
              <div className="flex justify-between gap-3 text-sm text-verde">
                <dt>Descuento por hermanos</dt>
                <dd className="tabular-nums">−{formatearPrecio(pago.total.descuento)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-titulo text-lg font-semibold text-marino">Total a pagar</dt>
              <dd className="font-titulo text-2xl font-bold text-naranja tabular-nums">{formatearPrecio(pago.total.total)}</dd>
            </div>
          </dl>
          {pago.datosPago && (
            <div className="mt-4 rounded-xl bg-white p-3">
              <p className="text-xs font-semibold tracking-wide text-marino uppercase">Datos para transferir</p>
              <p className="mt-1 font-medium whitespace-pre-line text-marino select-all">{pago.datosPago}</p>
            </div>
          )}
          <a
            href={enlaceWhatsapp(pago.whatsapp, mensajeComprobante)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 font-titulo text-lg font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <IconoWhatsapp className="size-6" />
            Mandar el comprobante
          </a>
          <p className="mt-2 text-center text-xs text-texto/80">Se abre WhatsApp con un mensaje listo: adjuntá la foto o el PDF del comprobante.</p>
        </div>
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-naranja px-8 py-3 font-titulo text-xl font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
