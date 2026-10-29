import { z } from "zod";
import { validarGruposEdad } from "@/lib/dominio/grupos";
import { normalizarEnlaceGrupo } from "@/lib/dominio/mensajes";

// Edición de los grupos de edad de una temporada desde el panel.

export const grupoEdadSchema = z.object({
  id: z.number().int().optional(),
  nombre: z.string().trim().min(1, "Ingresá el nombre del grupo.").max(60, "Puede tener hasta 60 caracteres."),
  edadMin: z.coerce.number().int("Tiene que ser un número entero.").min(0, "No puede ser negativa."),
  edadMax: z.coerce.number().int("Tiene que ser un número entero.").min(0, "No puede ser negativa."),
  // Link del grupo de WhatsApp de papis; vacío = sin grupo.
  enlaceWhatsapp: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const enlace = normalizarEnlaceGrupo(v ?? "");
      if (enlace === "invalido") {
        ctx.addIssue({ code: "custom", message: "El link del grupo de WhatsApp tiene que empezar con https://chat.whatsapp.com/" });
        return z.NEVER;
      }
      return enlace;
    }),
});

/** Lista completa de grupos de una temporada; valida además rangos y superposiciones. */
export const gruposTemporadaSchema = z.array(grupoEdadSchema).superRefine((grupos, ctx) => {
  for (const error of validarGruposEdad(grupos)) {
    ctx.addIssue({ code: "custom", message: error });
  }
});

export type GrupoEdadValidado = z.output<typeof grupoEdadSchema>;
