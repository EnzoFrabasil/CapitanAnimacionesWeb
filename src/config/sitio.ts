// Contenido editable del sitio. Se completa en la etapa 5 (página de inicio).
// Los valores marcados con TODO son de ejemplo y hay que reemplazarlos.

export const sitio = {
  nombre: "Capitán Animaciones",
  descripcion: "TODO: Colonia de vacaciones de Capitán Animaciones. ¡Sumate a la tripulación!",
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
    ola: "/marca/ola.png",
    ancla: "/marca/ancla.png",
    botella: "/marca/botella.png",
    barco: "/marca/barco.png",
  },
} as const;
