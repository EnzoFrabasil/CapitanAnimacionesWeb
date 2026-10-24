import type { TextosInscripcion } from "@/lib/contenido/esquema";

// Textos del formulario de inscripción que se editan desde el panel
// (Editar página de inicio → Textos de la inscripción). Estos son los valores
// iniciales, que se usan también para las versiones publicadas antes de que
// existieran estos textos.

export const textosInscripcionIniciales: TextosInscripcion = {
  titulo: "¡Sumate a la tripulación!",
  pasoContactos: "Contactos",
  pasoNinos: "Niños",
  pasoRevision: "Revisión",
  introContactos:
    "Dejanos un contacto y te escribimos por WhatsApp (o te llamamos) para confirmar la inscripción. Si querés, podés sumar más contactos.",
  introNinos: "Contanos quiénes se suman a la tripulación. Podés inscribir hasta 10 chicos juntos.",
  ayudaInfoAdicional: "Alergias, medicación, condiciones o cualquier cosa que debamos saber",
  introRevision: "Revisá que esté todo bien antes de enviar.",
  textoAceptacion: "Acepto que Capitán Animaciones use estos datos para organizar la colonia y cuidar a los chicos.",
  botonEnviar: "Enviar inscripción",
  exitoTitulo: "¡Inscripción realizada con éxito!",
  exitoTexto:
    "Quedaron anotados en la lista de espera. Te vamos a contactar por WhatsApp o por teléfono para confirmar el lugar. ¡Gracias por sumarte a la tripulación!",
  cerradasTitulo: "Las inscripciones están cerradas",
  cerradasTexto: "Por ahora no estamos tomando inscripciones. Seguinos en Instagram para enterarte cuando abramos.",
};
