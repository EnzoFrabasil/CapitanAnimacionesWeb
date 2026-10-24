import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Bienvenida } from "@/components/marca/Bienvenida";
import { Encabezado } from "@/components/marca/Encabezado";
import { PiePagina } from "@/components/marca/PiePagina";
import { sitio } from "@/config/sitio";
import { fechaAIso, hoyEnArgentina } from "@/lib/dominio/fechas";
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
  const temporada = await buscarTemporadaAbierta();

  if (!temporada) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center shadow-md">
        <h1 className="font-titulo text-3xl font-bold text-marino">Las inscripciones están cerradas</h1>
        <p className="mt-3">
          Por ahora no estamos tomando inscripciones. Seguinos en Instagram{" "}
          <a href={sitio.instagram.url} className="font-semibold text-marino underline">
            {sitio.instagram.usuario}
          </a>{" "}
          para enterarte cuando abramos.
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-marino underline">
          Volver al inicio
        </Link>
      </section>
    );
  }

  return (
    <FormularioInscripcion
      temporadaId={temporada.id}
      nombreTemporada={temporada.nombre}
      contexto={{ semanas: temporada.semanas, hoy: fechaAIso(hoyEnArgentina()) }}
    />
  );
}
