-- AlterTable
ALTER TABLE "GrupoEdad" ADD COLUMN     "enlaceWhatsapp" TEXT;

-- CreateTable
CREATE TABLE "Ajuste" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("clave")
);


-- Permiso nuevo para editar los mensajes de WhatsApp y los datos de pago:
-- lo recibe el rol Administrador (el de acceso total lo tiene siempre).
UPDATE "Rol" SET "permisos" = array_append("permisos", 'mensajes.editar')
WHERE "clave" = 'administrador' AND NOT ('mensajes.editar' = ANY("permisos"));
