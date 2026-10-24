// Datos fijos de la marca: nombre, logos e ilustraciones.
// El contenido de la página de inicio (textos, imágenes, ubicación, WhatsApp,
// redes y preguntas frecuentes) se edita desde el panel: ver
// src/config/contenidoInicial.ts y src/lib/contenido/.
// Los colores y tipografías están en src/app/globals.css (tema de Tailwind).

export type { ColorAcento } from "@/lib/contenido/esquema";

export const sitio = {
  nombre: "Capitán Animaciones",
  eslogan: "¡Sumate a la tripulación!",

  instagram: {
    usuario: "@capitan.animaciones",
    url: "https://www.instagram.com/capitan.animaciones/",
  },

  logos: {
    texto: "/marca/logo-texto.png",
    circular: "/marca/logo-circular.png",
    capitanTimon: "/marca/capitan-timon.png",
    capitanBarco: "/marca/capitan-barco.png",
    capitanColgado: "/marca/capitan-colgado.png",
  },

  // Ilustraciones decorativas para las esquinas de las secciones.
  decoraciones: {
    timon: "/marca/timon.png",
    estrella: "/marca/estrella.svg",
    ancla: "/marca/ancla.png",
    botella: "/marca/botella.png",
    barco: "/marca/barco.png",
  },
} as const;
