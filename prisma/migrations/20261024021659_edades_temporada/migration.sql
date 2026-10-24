-- AlterTable
ALTER TABLE "Temporada" ADD COLUMN     "edadMaxima" INTEGER NOT NULL DEFAULT 17,
ADD COLUMN     "edadMinima" INTEGER NOT NULL DEFAULT 2;

-- En esta edición de la colonia la edad permitida es de 4 a 13 años.
-- Se cambia desde Configuración.
UPDATE "Temporada" SET "edadMinima" = 4, "edadMaxima" = 13;
