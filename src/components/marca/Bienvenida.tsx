"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { sitio } from "@/config/sitio";

const CLAVE_VISTA = "capitan-bienvenida";

/** Si la imagen no cargó en este tiempo (conexión lenta), se saltea la animación. */
const ESPERA_MAXIMA_MS = 3000;

// Se ejecuta antes de pintar: si la animación ya se vio en esta pestaña, la oculta
// (sin parpadeo); si no, la marca como vista para la próxima página.
const SCRIPT_UNA_VEZ = `try{if(sessionStorage.getItem("${CLAVE_VISTA}"))document.documentElement.dataset.bienvenidaVista="";else sessionStorage.setItem("${CLAVE_VISTA}","1")}catch(e){}`;

const sinSuscripcion = () => () => {};
/** true si el script de arriba marcó que la animación ya se vio (en el servidor, siempre false). */
const leerYaVista = () => "bienvenidaVista" in document.documentElement.dataset;

/** Rayos del sol (coordenadas redondeadas para que servidor y navegador generen el mismo HTML). */
const RAYOS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const r = (n: number) => Math.round(n * 10) / 10;
  return [r(100 + Math.cos(a) * 66), r(100 + Math.sin(a) * 66), r(100 + Math.cos(a) * 88), r(100 + Math.sin(a) * 88)];
});

/** Dirección de cada gota del salpicón cuando el capitán cae al agua. */
const GOTAS = [
  [-90, -120],
  [-50, -170],
  [-15, -140],
  [25, -180],
  [60, -130],
  [95, -110],
] as const;

/**
 * Animación de bienvenida: el logo cae rebotando, el capitán queda colgado
 * hamacándose, se suelta y cae al mar; después todo sube como una cortina.
 * Dura unos 4,5 segundos, se puede saltar tocando la pantalla y se muestra una
 * sola vez por visita (se pone en cada página pública, no en el panel). No se
 * muestra con "reducir movimiento" (ver globals.css).
 */
export function Bienvenida() {
  const yaVista = useSyncExternalStore(sinSuscripcion, leerYaVista, () => false);
  const [activa, setActiva] = useState(true);
  // La animación arranca recién cuando la imagen está cargada (ver [data-lista] en globals.css).
  const [lista, setLista] = useState(false);

  // Al terminar se marca como vista también en <html>, para que no vuelva a
  // aparecer al navegar a otra página sin recargar.
  const terminar = () => {
    document.documentElement.dataset.bienvenidaVista = "";
    setActiva(false);
  };

  useEffect(() => {
    if (lista || yaVista) return;
    const t = setTimeout(terminar, ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [lista, yaVista]);

  if (!activa || yaVista) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_UNA_VEZ }} />
      <div
        className="bienvenida"
        data-lista={lista ? "" : undefined}
        aria-hidden
        onClick={terminar}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) terminar();
        }}
      >
        {/* Cielo: sol y nubes con el mismo borde celeste del logo. */}
        <svg className="bienvenida-sol" viewBox="0 0 200 200" aria-hidden>
          <g className="bienvenida-rayos" stroke="#fba445" strokeWidth="10" strokeLinecap="round">
            {RAYOS.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
          <circle cx="100" cy="100" r="52" fill="#fba445" stroke="#fff4db" strokeWidth="6" />
          <circle cx="100" cy="100" r="40" fill="#fdbd6a" />
        </svg>
        <svg className="bienvenida-nube bienvenida-nube-1" viewBox="0 0 200 90" aria-hidden>
          <path
            d="M40 78C18 78 8 62 14 48 20 34 38 30 50 36 54 18 72 8 92 12 108 4 132 8 140 26 156 20 178 28 180 46 196 50 198 78 176 78Z"
            fill="white"
            stroke="#b8e5fc"
            strokeWidth="7"
            strokeLinejoin="round"
          />
        </svg>
        <svg className="bienvenida-nube bienvenida-nube-2" viewBox="0 0 200 90" aria-hidden>
          <path
            d="M40 78C18 78 8 62 14 48 20 34 38 30 50 36 54 18 72 8 92 12 108 4 132 8 140 26 156 20 178 28 180 46 196 50 198 78 176 78Z"
            fill="white"
            stroke="#b8e5fc"
            strokeWidth="7"
            strokeLinejoin="round"
          />
        </svg>

        <svg className="bienvenida-mar" viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            className="bienvenida-ola"
            d="M0 60c120 30 240 30 360 0s240-30 360 0 240 30 360 0 240-30 360 0 240 30 360 0V200H0Z"
            fill="var(--color-azul)"
            opacity="0.35"
          />
          <path
            d="M0 100c120 26 240 26 360 0s240-26 360 0 240 26 360 0 240-26 360 0V200H0Z"
            fill="var(--color-azul)"
          />
        </svg>

        <div className="bienvenida-escena">
          <span className="bienvenida-parche" />
          <Image
            src={sitio.logos.capitanColgado}
            alt=""
            width={2213}
            height={1669}
            priority
            // Si la imagen ya estaba en caché, puede cargar antes de que React escuche onLoad.
            ref={(el) => {
              if (el?.complete && el.naturalWidth > 0) setLista(true);
            }}
            onLoad={() => setLista(true)}
            className="bienvenida-capa bienvenida-capitan"
          />
          <Image
            src={sitio.logos.capitanColgado}
            alt=""
            width={2213}
            height={1669}
            priority
            className="bienvenida-capa bienvenida-logo"
          />
        </div>

        {GOTAS.map(([dx, dy], i) => (
          <span key={i} className="bienvenida-gota" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties} />
        ))}

        <button type="button" className="bienvenida-saltar" tabIndex={-1}>
          Saltar
        </button>
      </div>
    </>
  );
}
