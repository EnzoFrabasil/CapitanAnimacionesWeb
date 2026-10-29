import type { Plantilla } from "@/lib/dominio/mensajes";

// Textos iniciales de los mensajes de WhatsApp. Se editan desde el panel
// (Sitio web → Mensajes de WhatsApp); estos se usan hasta que alguien guarde.

export const PLANTILLAS_INICIALES: Record<Plantilla, string> = {
  saludo: "¡Hola {contacto}! 👋 Te escribimos de {marca} por la inscripción de {chicos} a la {temporada}.",
  monto: [
    "¡Hola {contacto}! Somos {marca} ⚓",
    "Te escribimos por la inscripción de {chicos} a la {temporada}.",
    "",
    "Este es el detalle:",
    "{detalle}",
    "",
    "{descuento}",
    "*Total a pagar: {total}*",
    "",
    "{datosPago}",
    "",
    "Cualquier duda nos escribís por acá. ¡Gracias!",
  ].join("\n"),
  confirmado: [
    "¡Hola {contacto}! Somos {marca} 🎉",
    "Te confirmamos el lugar de {chicos} en la {temporada}:",
    "{fechas}",
    "",
    "{gruposWhatsapp}",
    "",
    "¡Los esperamos!",
  ].join("\n"),
};

export const LARGO_MAXIMO_PLANTILLA = 2000;
export const LARGO_MAXIMO_DATOS_PAGO = 500;
