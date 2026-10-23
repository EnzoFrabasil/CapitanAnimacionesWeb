// Contenido editable del sitio: textos, contacto, redes, preguntas frecuentes e imágenes.
// Todo lo marcado con TODO es un valor de ejemplo que hay que reemplazar.
// Los colores y tipografías están en src/app/globals.css (tema de Tailwind).

/** Colores de la paleta disponibles como acento de cada sección. */
export type ColorAcento = "naranja" | "azul" | "verde" | "violeta" | "amarillo" | "petroleo" | "rojo";

export const sitio = {
  nombre: "Capitán Animaciones",
  eslogan: "¡Sumate a la tripulación!",
  descripcion:
    "TODO: Colonia de vacaciones de Capitán Animaciones: juegos, aventuras y amigos para chicos de 3 a 12 años. ¡Sumate a la tripulación!",

  // WhatsApp de la colonia (botón flotante). Formato internacional, solo dígitos.
  whatsapp: {
    numero: "5491100000000", // TODO: número real de la colonia
    mensaje: "¡Hola! Quiero más información sobre la colonia.",
  },

  // La dirección se usa como texto y para generar el mapa de Google Maps.
  ubicacion: {
    titulo: "TODO: Nombre del lugar (club, escuela, etc.)",
    direccion: "TODO: Av. Siempreviva 742, Buenos Aires, Argentina",
    detalle: "TODO: Cómo llegar, estacionamiento, colectivos que pasan cerca.",
  },

  instagram: {
    usuario: "@capitan.animaciones",
    url: "https://www.instagram.com/capitan.animaciones/",
  },

  // Redes que se muestran en la sección de contacto. Para ocultar una, borrala de la lista.
  redes: [
    { red: "instagram", nombre: "Instagram", usuario: "@capitan.animaciones", url: "https://www.instagram.com/capitan.animaciones/" },
    { red: "facebook", nombre: "Facebook", usuario: "TODO: Capitán Animaciones", url: "https://www.facebook.com/" }, // TODO
    { red: "tiktok", nombre: "TikTok", usuario: "TODO: @capitan.animaciones", url: "https://www.tiktok.com/" }, // TODO
  ],

  inicio: {
    etiqueta: "Colonia de vacaciones", // TODO: por ejemplo "Colonia de verano 2027"
    titulo: "¡Zarpamos hacia el mejor verano!",
    subtitulo:
      "TODO: Juegos, deportes, pileta, arte y un montón de aventuras para que los chicos pasen las vacaciones a lo grande.",
    textoBoton: "Inscribite",
    notaBoton: "Al inscribirte quedás en la lista de espera.",
  },

  // Secciones de información (texto + imagen). Se pueden agregar o quitar.
  secciones: [
    {
      id: "la-colonia",
      titulo: "¿Qué es la colonia?",
      texto:
        "TODO: Un espacio para que los chicos jueguen, compartan y descubran cosas nuevas con un equipo de profes y animadores con experiencia.",
      imagen: "/marca/capitan-timon.png",
      alt: "El capitán al timón",
      acento: "naranja",
    },
    {
      id: "actividades",
      titulo: "Actividades",
      texto:
        "TODO: Juegos en equipo, deportes, pileta, plástica, música, búsquedas del tesoro y fiestas temáticas de piratas.",
      imagen: "/marca/capitan-barco.png",
      alt: "El capitán en su barco",
      acento: "azul",
    },
    {
      id: "turnos",
      titulo: "Turnos y modalidades",
      texto:
        "TODO: Turno mañana de 9 a 13 h y turno tarde de 14 a 18 h. Podés anotarlos por semanas completas o por días sueltos.",
      imagen: "/marca/capitan-colgado.png",
      alt: "El capitán colgado del logo",
      acento: "verde",
    },
  ] satisfies readonly { id: string; titulo: string; texto: string; imagen: string; alt: string; acento: ColorAcento }[],

  preguntasFrecuentes: [
    {
      pregunta: "¿Qué edades pueden participar?",
      respuesta: "TODO: Chicos y chicas de 3 a 12 años, divididos en grupos según la edad.",
    },
    {
      pregunta: "¿La inscripción ya asegura el lugar?",
      respuesta:
        "No. Al inscribirte quedás en la lista de espera. Después te escribimos por WhatsApp para confirmar el lugar y contarte cómo seguir.",
    },
    {
      pregunta: "¿Puedo anotarlos solo algunos días?",
      respuesta: "Sí. En el formulario elegís si van por semanas completas o por días sueltos.",
    },
    {
      pregunta: "¿Qué tienen que llevar?",
      respuesta: "TODO: Ropa cómoda, gorra, protector solar, malla, toallón, ojotas y una botella de agua con nombre.",
    },
    {
      pregunta: "¿Cuánto cuesta?",
      respuesta: "TODO: Te pasamos los precios por WhatsApp cuando confirmamos el lugar.",
    },
  ],

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

export const urlWhatsapp = `https://wa.me/${sitio.whatsapp.numero}?text=${encodeURIComponent(sitio.whatsapp.mensaje)}`;

export const urlMapa = `https://www.google.com/maps?q=${encodeURIComponent(sitio.ubicacion.direccion)}&output=embed`;

export const urlComoLlegar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sitio.ubicacion.direccion)}`;
