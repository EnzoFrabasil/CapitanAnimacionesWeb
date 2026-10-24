import type { Contenido } from "@/lib/contenido/esquema";
import { textosInscripcionIniciales } from "./textosInscripcion";

// Contenido de la página de inicio mientras ningún administrador haya publicado
// cambios desde el panel (Panel → Página de inicio). Lo marcado con TODO es un
// valor de ejemplo: lo ideal es reemplazarlo desde el editor, no acá.

export const contenidoInicial: Contenido = {
  descripcion:
    "Colonia de vacaciones de Capitán Animaciones: juegos, aventuras y amigos para chicos de 3 a 12 años. ¡Sumate a la tripulación!",

  // Formato internacional, solo dígitos.
  whatsapp: {
    numero: "5491100000000", // TODO: número real de la colonia
    mensaje: "¡Hola! Quiero más información sobre la colonia.",
  },

  inicio: {
    etiqueta: "Colonia de vacaciones",
    titulo: "¡Zarpamos hacia el mejor verano!",
    subtitulo:
      "Juegos, deportes, pileta, arte y un montón de aventuras para que los chicos pasen las vacaciones a lo grande.",
    textoBoton: "Inscribite",
    notaBoton: "Al inscribirte quedás en la lista de espera.",
    imagen: "/marca/capitan-barco.png",
    alt: "El capitán en su barco mirando con el catalejo",
  },

  secciones: [
    {
      id: "la-colonia",
      titulo: "¿Qué es la colonia?",
      texto:
        "Un espacio para que los chicos jueguen, compartan y descubran cosas nuevas con un equipo de profes y animadores con experiencia.",
      imagen: "/marca/capitan-timon.png",
      alt: "El capitán al timón",
      acento: "naranja",
    },
    {
      id: "actividades",
      titulo: "Actividades",
      texto:
        "Juegos en equipo, deportes, pileta, plástica, música, búsquedas del tesoro y fiestas temáticas de piratas.",
      imagen: "/marca/capitan-barco.png",
      alt: "El capitán en su barco",
      acento: "azul",
    },
    {
      id: "turnos",
      titulo: "Turnos y modalidades",
      texto:
        "Turno mañana de 9 a 13 h y turno tarde de 14 a 18 h. Podés anotarlos por semanas completas o por días sueltos.",
      imagen: "/marca/capitan-colgado.png",
      alt: "El capitán colgado del logo",
      acento: "verde",
    },
  ],

  // El mapa de Google Maps busca "nombre del lugar, dirección".
  ubicacion: {
    tituloSeccion: "¿Dónde zarpamos?",
    titulo: "Liga Mercedina de Padres de Familia",
    direccion: "Mercedes, Provincia de Buenos Aires",
    detalle: "",
  },

  preguntas: {
    tituloSeccion: "Preguntas frecuentes",
    lista: [
      {
        pregunta: "¿Qué edades pueden participar?",
        respuesta: "Chicos y chicas de 3 a 12 años, divididos en grupos según la edad.",
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
        respuesta: "Ropa cómoda, gorra, protector solar, malla, toallón, ojotas y una botella de agua con nombre.",
      },
      {
        pregunta: "¿Cuánto cuesta?",
        respuesta: "Te pasamos los precios por WhatsApp cuando confirmamos el lugar.",
      },
    ],
  },

  contacto: {
    titulo: "¿Listos para zarpar?",
    texto: "Anotalos ahora y quedan en la lista de espera. ¿Tenés dudas? Escribinos o seguinos en las redes.",
    redes: [
      {
        red: "instagram",
        nombre: "Instagram",
        usuario: "@capitan.animaciones",
        url: "https://www.instagram.com/capitan.animaciones/",
      },
    ],
  },

  inscripcion: textosInscripcionIniciales,
};
