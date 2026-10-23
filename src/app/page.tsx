import Image from "next/image";
import Link from "next/link";
import { Aparecer } from "@/components/marca/Aparecer";
import { BotonWhatsapp } from "@/components/marca/BotonWhatsapp";
import { CLASES_ACENTO } from "@/components/marca/acentos";
import { Decoracion } from "@/components/marca/Decoracion";
import { Encabezado } from "@/components/marca/Encabezado";
import { IconoFlecha, IconoRed, IconoWhatsapp } from "@/components/marca/iconos";
import { PiePagina } from "@/components/marca/PiePagina";
import { sitio, urlComoLlegar, urlMapa, urlWhatsapp } from "@/config/sitio";

const ENLACES = [
  { href: "#la-colonia", texto: "La colonia" },
  { href: "#ubicacion", texto: "Ubicación" },
  { href: "#preguntas", texto: "Preguntas" },
  { href: "#contacto", texto: "Contacto" },
];

function BotonInscribite({ grande = false }: { grande?: boolean }) {
  return (
    <Link
      href="/inscripcion"
      className={`inline-block rounded-full bg-naranja font-titulo font-bold text-white shadow-[0_6px_0_0_#093651] transition hover:-translate-y-1 hover:shadow-[0_10px_0_0_#093651] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-marino active:translate-y-1 active:shadow-[0_2px_0_0_#093651] ${
        grande ? "px-10 py-4 text-3xl sm:px-14 sm:py-5 sm:text-4xl" : "px-8 py-3 text-2xl"
      }`}
    >
      {sitio.inicio.textoBoton}
    </Link>
  );
}

function TituloSeccion({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-titulo text-3xl font-bold text-marino sm:text-4xl">
      {children}
    </h2>
  );
}

export default function Inicio() {
  return (
    <>
      <Encabezado enlaces={ENLACES} />

      <main className="flex-1">
        {/* Banner principal */}
        <section className="relative overflow-hidden" aria-labelledby="titulo-principal">
          <Decoracion src={sitio.decoraciones.timon} posicion="arriba-izquierda" className="top-4! left-2!" />
          <Decoracion src={sitio.decoraciones.ola} posicion="abajo-derecha" />
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-16 md:pb-24">
            <div className="text-center md:text-left">
              <p className="inline-block rounded-full bg-amarillo px-4 py-1 font-semibold text-marino">
                {sitio.inicio.etiqueta}
              </p>
              <h1 id="titulo-principal" className="mt-4 font-titulo text-5xl leading-tight font-bold text-marino sm:text-6xl">
                {sitio.nombre}
              </h1>
              <p className="mt-2 font-titulo text-3xl font-semibold text-naranja sm:text-4xl">{sitio.inicio.titulo}</p>
              <p className="mx-auto mt-4 max-w-lg text-lg md:mx-0">{sitio.inicio.subtitulo}</p>
              <div className="mt-8">
                <BotonInscribite grande />
                <p className="mt-4 text-sm">{sitio.inicio.notaBoton}</p>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute inset-6 -z-10 rounded-full bg-azul/15 blur-2xl" />
              <Image
                src={sitio.logos.capitanBarco}
                alt="El capitán en su barco mirando con el catalejo"
                width={2909}
                height={2719}
                priority
                className="mx-auto w-full max-w-md animate-flotar md:max-w-none"
              />
            </div>
          </div>
          <svg aria-hidden viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute bottom-0 h-10 w-full text-white sm:h-16">
            <path d="M0 40c120 26 240 26 360 0s240-26 360 0 240 26 360 0 240-26 360 0v40H0Z" fill="currentColor" />
          </svg>
        </section>

        {/* Información */}
        <div className="bg-white">
          {sitio.secciones.map((s, i) => {
            const acento = CLASES_ACENTO[s.acento];
            const imagenALaDerecha = i % 2 === 1;
            return (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-24 px-4 py-12 sm:py-16">
                <Aparecer className="mx-auto max-w-6xl">
                  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                    <div className={imagenALaDerecha ? "md:order-2" : ""}>
                      <div
                        className={`group rounded-[2rem] border-4 bg-white p-4 shadow-[0_8px_24px_rgba(9,54,81,0.12)] transition duration-300 hover:-rotate-1 hover:scale-[1.02] ${acento.borde}`}
                      >
                        <div className={`overflow-hidden rounded-3xl ${acento.fondoSuave}`}>
                          <Image
                            src={s.imagen}
                            alt={s.alt}
                            width={600}
                            height={600}
                            className="mx-auto h-64 w-auto object-contain transition duration-500 group-hover:scale-105 sm:h-80"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <span aria-hidden className={`mb-3 block h-2 w-16 rounded-full ${acento.punto}`} />
                      <TituloSeccion id={`${s.id}-titulo`}>{s.titulo}</TituloSeccion>
                      <p className="mt-4 text-lg leading-relaxed">{s.texto}</p>
                    </div>
                  </div>
                </Aparecer>
              </section>
            );
          })}
        </div>

        {/* Ubicación */}
        <section id="ubicacion" aria-labelledby="ubicacion-titulo" className="relative scroll-mt-24 overflow-hidden px-4 py-16">
          <Decoracion src={sitio.decoraciones.ancla} posicion="arriba-derecha" />
          <Aparecer className="mx-auto max-w-6xl">
            <TituloSeccion id="ubicacion-titulo">¿Dónde zarpamos?</TituloSeccion>
            <div className="mt-6 grid gap-6 rounded-[2rem] bg-white p-4 shadow-[0_8px_24px_rgba(9,54,81,0.12)] sm:p-6 md:grid-cols-5">
              <div className="md:col-span-2">
                <p className="font-titulo text-2xl font-semibold text-marino">{sitio.ubicacion.titulo}</p>
                <p className="mt-2 text-lg">{sitio.ubicacion.direccion}</p>
                <p className="mt-3">{sitio.ubicacion.detalle}</p>
                <a
                  href={urlComoLlegar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block rounded-full border-2 border-marino px-5 py-2 font-semibold text-marino transition hover:bg-marino hover:text-white"
                >
                  Cómo llegar
                </a>
              </div>
              <iframe
                title={`Mapa: ${sitio.ubicacion.direccion}`}
                src={urlMapa}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full rounded-3xl border-0 md:col-span-3 md:h-80"
              />
            </div>
          </Aparecer>
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" aria-labelledby="preguntas-titulo" className="relative scroll-mt-24 overflow-hidden bg-white px-4 py-16">
          <Decoracion src={sitio.decoraciones.botella} posicion="abajo-izquierda" />
          <Aparecer className="mx-auto max-w-3xl">
            <TituloSeccion id="preguntas-titulo">Preguntas frecuentes</TituloSeccion>
            <div className="mt-6 space-y-3">
              {sitio.preguntasFrecuentes.map((p) => (
                <details
                  key={p.pregunta}
                  className="group rounded-2xl border-2 border-marino/15 bg-white transition open:border-naranja open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold text-marino [&::-webkit-details-marker]:hidden">
                    {p.pregunta}
                    <IconoFlecha className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 leading-relaxed">{p.respuesta}</p>
                </details>
              ))}
            </div>
          </Aparecer>
        </section>

        {/* Contacto y redes */}
        <section id="contacto" aria-labelledby="contacto-titulo" className="relative scroll-mt-24 overflow-hidden px-4 py-16">
          <Decoracion src={sitio.decoraciones.barco} posicion="arriba-derecha" />
          <Aparecer className="mx-auto max-w-3xl text-center">
            <Image
              src={sitio.logos.circular}
              alt=""
              width={512}
              height={512}
              className="mx-auto mb-4 size-28 rounded-full shadow-md transition duration-500 hover:rotate-12"
            />
            <TituloSeccion id="contacto-titulo">¿Listos para zarpar?</TituloSeccion>
            <p className="mx-auto mt-3 max-w-xl text-lg">
              Anotalos ahora y quedan en la lista de espera. ¿Tenés dudas? Escribinos o seguinos en las redes.
            </p>
            <div className="mt-8">
              <BotonInscribite />
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-3">
              <li>
                <a
                  href={urlWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border-2 border-marino/20 bg-white px-5 py-3 font-semibold text-marino transition hover:-translate-y-0.5 hover:border-marino"
                >
                  <IconoWhatsapp className="size-6" /> WhatsApp
                </a>
              </li>
              {sitio.redes.map((r) => (
                <li key={r.red}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${r.nombre}: ${r.usuario}`}
                    className="flex items-center gap-2 rounded-full border-2 border-marino/20 bg-white px-5 py-3 font-semibold text-marino transition hover:-translate-y-0.5 hover:border-marino"
                  >
                    <IconoRed red={r.red} className="size-6" /> {r.nombre}
                  </a>
                </li>
              ))}
            </ul>
          </Aparecer>
        </section>
      </main>

      <PiePagina />
      <BotonWhatsapp />
    </>
  );
}
