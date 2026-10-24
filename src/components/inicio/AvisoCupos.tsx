"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sitio } from "@/config/sitio";
import { urgenciaCupos, type Cupos } from "@/lib/dominio/cupos";

const DURACION_CUENTA_MS = 1600;
/** Espera después de la bienvenida antes de aparecer por primera vez. */
const PRIMERA_VEZ_MS = 400;

type Fase = "oculto" | "insignia" | "mensaje" | "abierto" | "guardado" | "escondido";

/**
 * Cuánto dura cada fase y a cuál pasa después. Es un ciclo: aparece, llega el
 * mensaje, se abre el globito, se guarda, se esconde del todo y al rato vuelve.
 */
const SIGUIENTE: Partial<Record<Fase, [Fase, number]>> = {
  insignia: ["mensaje", 700],
  mensaje: ["abierto", 1200],
  abierto: ["guardado", 8000],
  guardado: ["escondido", 5000],
  escondido: ["insignia", 60000],
};

/**
 * Aviso de lugares con la insignia del capitán (esquina inferior izquierda, solo
 * en la página de inicio). Aparece cuando termina la bienvenida, le "llega un
 * mensaje" (puntito rojo), se abre un globito con los lugares que quedan, se
 * guarda, se esconde y cada un minuto vuelve a aparecer (ver SIGUIENTE).
 * Tocar la insignia abre o cierra el globito; tocar el globito lleva a la inscripción.
 */
export function AvisoCupos({ total, quedan }: Pick<Cupos, "total" | "quedan">) {
  const [fase, setFase] = useState<Fase>("oculto");
  const [mostrado, setMostrado] = useState(total);
  const yaConto = useRef(false);
  const abierto = fase === "abierto";
  const urgencia = urgenciaCupos({ total, quedan });

  // Primera aparición, después de la animación de bienvenida.
  useEffect(() => {
    let espera = 0;
    const esperarBienvenida = () => {
      const delay = document.querySelector(".bienvenida") ? 250 : PRIMERA_VEZ_MS;
      espera = window.setTimeout(() => {
        if (document.querySelector(".bienvenida")) esperarBienvenida();
        else setFase("insignia");
      }, delay);
    };
    esperarBienvenida();
    return () => clearTimeout(espera);
  }, []);

  // Avance automático del ciclo (si la persona toca la insignia, la fase cambia y el tiempo vuelve a empezar).
  useEffect(() => {
    const siguiente = SIGUIENTE[fase];
    if (!siguiente) return;
    const t = window.setTimeout(() => setFase(siguiente[0]), siguiente[1]);
    return () => clearTimeout(t);
  }, [fase]);

  // La primera vez que se abre el globito, el número baja desde el cupo total.
  useEffect(() => {
    if (!abierto) return;
    let cuadro = 0;
    if (!yaConto.current) {
      yaConto.current = true;
      const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = sinMovimiento ? 1 : Math.min(1, (ahora - inicio) / DURACION_CUENTA_MS);
        setMostrado(Math.round(total - (total - quedan) * (1 - (1 - t) ** 3)));
        if (t < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    }
    return () => cancelAnimationFrame(cuadro);
  }, [abierto, total, quedan]);

  if (fase === "oculto") return null;

  const texto =
    urgencia === "completo" ? (
      <>¡Cupo completo!</>
    ) : (
      <>
        {urgencia === "ultimos" ? "¡Últimos" : quedan === 1 ? "¡Queda" : "¡Quedan"}{" "}
        <span className="aviso-numero">{mostrado}</span> {quedan === 1 ? "lugar!" : "lugares!"}
      </>
    );

  return (
    <div className="aviso-cupos" data-fase={fase} data-urgencia={urgencia}>
      <button
        type="button"
        className="aviso-insignia"
        aria-expanded={abierto}
        aria-controls="aviso-cupos-globito"
        aria-label={abierto ? "Ocultar los lugares disponibles" : "Ver los lugares disponibles"}
        onClick={() => setFase(abierto ? "guardado" : "abierto")}
      >
        <Image src={sitio.logos.circular} alt="" width={615} height={615} sizes="64px" />
        {fase === "mensaje" && (
          <span className="aviso-punto" aria-hidden>
            1
          </span>
        )}
      </button>
      <Link
        id="aviso-cupos-globito"
        href="/inscripcion"
        className="aviso-globito"
        aria-hidden={!abierto}
        tabIndex={abierto ? undefined : -1}
      >
        {/* El número animado no se lee; el lector de pantalla recibe el valor final. */}
        <span aria-hidden>{texto}</span>
        <span className="sr-only">
          {urgencia === "completo" ? "Cupo completo." : `Quedan ${quedan} de ${total} lugares.`} Inscribite.
        </span>
      </Link>
    </div>
  );
}
