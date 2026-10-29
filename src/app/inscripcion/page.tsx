import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Bienvenida } from "@/components/marca/Bienvenida";
import { Encabezado } from "@/components/marca/Encabezado";
import { PiePagina } from "@/components/marca/PiePagina";
import { sitio } from "@/config/sitio";
import { fechaAIso, hoyEnArgentina } from "@/lib/dominio/fechas";
import { obtenerContenido } from "@/lib/contenido/servidor";
import { obtenerMensajes } from "@/lib/mensajes/servidor";
import { buscarTemporadaAbierta } from "@/lib/temporada";
import { FormularioInscripcion } from "./FormularioInscripcion";

export const metadata: Metadata = {
  title: `Inscripción | ${sitio.nombre}`,
  description: "Inscribí a tus hijos/as a la colonia. ¡Sumate a la tripulación!",
};

export default function PaginaInscripcion() {
  return (
    <>
      <Bienvenida />
      <Encabezado mostrarInscribite={false} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="py-16 text-center">Cargando el formulario…</p>}>
          <Contenido />
        </Suspense>
      </main>
      <PiePagina />
    </>
  );
}

async function Contenido() {
  await connection(); // siempre con datos frescos: si se cierra la inscripción, se ve al instante
  const [temporada, contenido] = await Promise.all([buscarTemporadaAbierta(), obtenerContenido()]);
  const textos = contenido.inscripcion;

  // Con el cupo completo se muestra igual que cerrada (la próxima inscripción la cierra del todo).
  if (!temporada || temporada.lugares === 0) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center shadow-md">
        <h1 className="font-titulo text-3xl font-bold text-marino">{textos.cerradasTitulo}</h1>
        {textos.cerradasTexto && <p className="mt-3 whitespace-pre-line">{textos.cerradasTexto}</p>}
        <p className="mt-3">
          Instagram:{" "}
          <a href={sitio.instagram.url} className="font-semibold text-marino underline">
            {sitio.instagram.usuario}
          </a>
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-marino underline">
          Volver al inicio
        </Link>
      </section>
    );
  }

  // Preinscripción: sin precios en ningún paso (aunque ya estén cargados) ni pedido de pago.
  const conPago = temporada.modo === "INSCRIPCION";
  const datosPago = conPago ? (await obtenerMensajes()).datosPago : "";

  return (
    <FormularioInscripcion
      textos={textos}
      temporadaId={temporada.id}
      nombreTemporada={temporada.nombre}
      contexto={{
        opciones: conPago ? temporada.opciones : temporada.opciones.map((o) => ({ ...o, precio: 0 })),
        modalidades: temporada.modalidades,
        edades: temporada.edades,
        precios: conPago ? temporada.precios : undefined,
        paquetes: conPago ? temporada.precios.paquetes : temporada.precios.paquetes.map((p) => ({ ...p, precio: 0 })),
        lugares: temporada.lugares,
        hoy: fechaAIso(hoyEnArgentina()),
      }}
      pago={conPago ? { datosPago, whatsapp: contenido.whatsapp.numero } : null}
    />
  );
}
