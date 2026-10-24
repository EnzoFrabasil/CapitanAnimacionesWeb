import Image from "next/image";
import Link from "next/link";
import { Aparecer } from "@/components/marca/Aparecer";
import { BotonWhatsapp } from "@/components/marca/BotonWhatsapp";
import { CLASES_ACENTO } from "@/components/marca/acentos";
import { Decoracion } from "@/components/marca/Decoracion";
import { Encabezado } from "@/components/marca/Encabezado";
import { PiePagina } from "@/components/marca/PiePagina";
import { sitio } from "@/config/sitio";
import type { Contenido } from "@/lib/contenido/esquema";
import { busquedaUbicacion, urlComoLlegar, urlWhatsapp } from "@/lib/contenido/urls";
import { AgregarSeccion, AjusteDescripcion, ControlesSeccion, ListaPreguntas, Redes } from "./controles";
import { ImagenEditable, Mapa, SoloPublico, Texto } from "./editables";

// Página de inicio. La usan el sitio público (src/app/page.tsx) y el editor del
// panel, que la envuelve en un contexto de edición: es la misma página, así que
// lo que se ve en el editor es lo que se publica.

function BotonInscribite({ texto, grande = false }: { texto: string; grande?: boolean }) {
  return (
    <Link
      href="/inscripcion"
      className={`inline-block rounded-full bg-naranja font-titulo font-bold text-white shadow-[0_6px_0_0_#093651] transition hover:-translate-y-1 hover:shadow-[0_10px_0_0_#093651] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-marino active:translate-y-1 active:shadow-[0_2px_0_0_#093651] ${
        grande ? "px-10 py-4 text-3xl sm:px-14 sm:py-5 sm:text-4xl" : "px-8 py-3 text-2xl"
      }`}
    >
      <Texto ruta={["inicio", "textoBoton"]} valor={texto} etiqueta="Texto del botón" />
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

export function VistaInicio({
  contenido: c,
  lugares,
  extras,
}: {
  contenido: Contenido;
  /** Línea con los lugares que quedan, arriba del botón "Inscribite" (solo en el sitio público). */
  lugares?: React.ReactNode;
  /** Elementos flotantes del sitio público (bienvenida, aviso del capitán). */
  extras?: React.ReactNode;
}) {
  const enlaces = [
    ...(c.secciones[0] ? [{ href: `#${c.secciones[0].id}`, texto: "La colonia" }] : []),
    { href: "#ubicacion", texto: "Ubicación" },
    { href: "#preguntas", texto: "Preguntas" },
    { href: "#contacto", texto: "Contacto" },
  ];

  return (
    <>
      <Encabezado enlaces={enlaces} />

      <main className="flex-1">
        <AjusteDescripcion descripcion={c.descripcion} />

        {/* Banner principal */}
        <section className="relative overflow-hidden" aria-labelledby="titulo-principal">
          <Decoracion src={sitio.decoraciones.timon} posicion="arriba-izquierda" className="top-4! left-2!" />
          <Decoracion src={sitio.decoraciones.estrella} posicion="abajo-derecha" className="right-4! bottom-6! z-10" />
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-16 md:pb-24">
            <div className="text-center md:text-left">
              <p className="inline-block rounded-full bg-amarillo px-4 py-1 font-semibold text-marino">
                <Texto ruta={["inicio", "etiqueta"]} valor={c.inicio.etiqueta} etiqueta="Etiqueta" />
              </p>
              <h1 id="titulo-principal" className="mt-4 font-titulo text-5xl leading-tight font-bold text-marino sm:text-6xl">
                {sitio.nombre}
              </h1>
              <p className="mt-2 font-titulo text-3xl font-semibold text-naranja sm:text-4xl">
                <Texto ruta={["inicio", "titulo"]} valor={c.inicio.titulo} etiqueta="Título" />
              </p>
              <p className="mx-auto mt-4 max-w-lg text-lg whitespace-pre-line md:mx-0">
                <Texto ruta={["inicio", "subtitulo"]} valor={c.inicio.subtitulo} etiqueta="Subtítulo" multilinea />
              </p>
              <div className="mt-8">
                {lugares}
                <BotonInscribite texto={c.inicio.textoBoton} grande />
                <p className="mt-4 text-sm">
                  <Texto ruta={["inicio", "notaBoton"]} valor={c.inicio.notaBoton} etiqueta="Nota debajo del botón" />
                </p>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute inset-6 -z-10 rounded-full bg-azul/15 blur-2xl" />
              <ImagenEditable
                ruta={["inicio", "imagen"]}
                rutaAlt={["inicio", "alt"]}
                src={c.inicio.imagen}
                alt={c.inicio.alt}
                width={1200}
                height={1120}
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
          {c.secciones.map((s, i) => {
            const acento = CLASES_ACENTO[s.acento];
            const imagenALaDerecha = i % 2 === 1;
            return (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-24 px-4 py-12 sm:py-16">
                <ControlesSeccion secciones={c.secciones} indice={i} />
                <Aparecer className="mx-auto max-w-6xl">
                  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                    <div className={imagenALaDerecha ? "md:order-2" : ""}>
                      <div
                        className={`group rounded-[2rem] border-4 bg-white p-4 shadow-[0_8px_24px_rgba(9,54,81,0.12)] transition duration-300 hover:-rotate-1 hover:scale-[1.02] ${acento.borde}`}
                      >
                        <div className={`overflow-hidden rounded-3xl ${acento.fondoSuave}`}>
                          <ImagenEditable
                            ruta={["secciones", i, "imagen"]}
                            rutaAlt={["secciones", i, "alt"]}
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
                      <TituloSeccion id={`${s.id}-titulo`}>
                        <Texto ruta={["secciones", i, "titulo"]} valor={s.titulo} etiqueta="Título de la sección" />
                      </TituloSeccion>
                      <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">
                        <Texto ruta={["secciones", i, "texto"]} valor={s.texto} etiqueta="Texto de la sección" multilinea />
                      </p>
                    </div>
                  </div>
                </Aparecer>
              </section>
            );
          })}
          <AgregarSeccion secciones={c.secciones} />
        </div>

        {/* Ubicación */}
        <section id="ubicacion" aria-labelledby="ubicacion-titulo" className="relative scroll-mt-24 overflow-hidden px-4 py-16">
          <Decoracion src={sitio.decoraciones.ancla} posicion="arriba-derecha" />
          <Aparecer className="mx-auto max-w-6xl">
            <TituloSeccion id="ubicacion-titulo">
              <Texto ruta={["ubicacion", "tituloSeccion"]} valor={c.ubicacion.tituloSeccion} etiqueta="Título de la sección" />
            </TituloSeccion>
            <div className="mt-6 grid gap-6 rounded-[2rem] bg-white p-4 shadow-[0_8px_24px_rgba(9,54,81,0.12)] sm:p-6 md:grid-cols-5">
              <div className="md:col-span-2">
                <p className="font-titulo text-2xl font-semibold text-marino">
                  <Texto ruta={["ubicacion", "titulo"]} valor={c.ubicacion.titulo} etiqueta="Nombre del lugar" />
                </p>
                <p className="mt-2 text-lg">
                  <Texto ruta={["ubicacion", "direccion"]} valor={c.ubicacion.direccion} etiqueta="Dirección (el mapa busca el nombre del lugar + la dirección)" />
                </p>
                <p className="mt-3 whitespace-pre-line">
                  <Texto ruta={["ubicacion", "detalle"]} valor={c.ubicacion.detalle} etiqueta="Cómo llegar" multilinea />
                </p>
                <a
                  href={urlComoLlegar(busquedaUbicacion(c.ubicacion))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block rounded-full border-2 border-marino px-5 py-2 font-semibold text-marino transition hover:bg-marino hover:text-white"
                >
                  Cómo llegar
                </a>
              </div>
              <Mapa busqueda={busquedaUbicacion(c.ubicacion)} />
            </div>
          </Aparecer>
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" aria-labelledby="preguntas-titulo" className="relative scroll-mt-24 overflow-hidden bg-white px-4 py-16">
          <Decoracion src={sitio.decoraciones.botella} posicion="abajo-izquierda" />
          <Aparecer className="mx-auto max-w-3xl">
            <TituloSeccion id="preguntas-titulo">
              <Texto ruta={["preguntas", "tituloSeccion"]} valor={c.preguntas.tituloSeccion} etiqueta="Título de la sección" />
            </TituloSeccion>
            <ListaPreguntas lista={c.preguntas.lista} />
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
            <TituloSeccion id="contacto-titulo">
              <Texto ruta={["contacto", "titulo"]} valor={c.contacto.titulo} etiqueta="Título de la sección" />
            </TituloSeccion>
            <p className="mx-auto mt-3 max-w-xl text-lg whitespace-pre-line">
              <Texto ruta={["contacto", "texto"]} valor={c.contacto.texto} etiqueta="Texto" multilinea />
            </p>
            <div className="mt-8">
              <BotonInscribite texto={c.inicio.textoBoton} />
            </div>
            <Redes contacto={c.contacto} whatsapp={c.whatsapp} />
          </Aparecer>
        </section>
      </main>

      <PiePagina />
      {extras}
      <SoloPublico>
        <BotonWhatsapp url={urlWhatsapp(c.whatsapp)} />
      </SoloPublico>
    </>
  );
}
