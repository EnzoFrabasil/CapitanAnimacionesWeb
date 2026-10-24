-- Opciones de inscripción: cada "semana" pasa a tener nombre libre, horario y
-- precio; el turno deja de ser un dato aparte (el horario viene con la opción).

-- CreateEnum
CREATE TYPE "DescuentoHermanos" AS ENUM ('AUTOMATICO', 'SI', 'NO');

-- AlterTable
ALTER TABLE "Familia" ADD COLUMN     "descuentoHermanos" "DescuentoHermanos" NOT NULL DEFAULT 'AUTOMATICO';

-- AlterTable
ALTER TABLE "Semana" ADD COLUMN     "horaFin" TEXT NOT NULL DEFAULT '12:30',
ADD COLUMN     "horaInicio" TEXT NOT NULL DEFAULT '08:30',
ADD COLUMN     "nombre" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "precio" INTEGER NOT NULL DEFAULT 0;

-- Cada día suelto queda asociado a su opción: se completa con la opción de la
-- misma temporada cuyas fechas lo contienen (la de menor número).
ALTER TABLE "InscripcionDia" ADD COLUMN "semanaId" INTEGER;
UPDATE "InscripcionDia" d
SET "semanaId" = (
  SELECT s."id"
  FROM "InscripcionNino" n
  JOIN "Inscripcion" i ON i."id" = n."inscripcionId"
  JOIN "Semana" s ON s."temporadaId" = i."temporadaId" AND d."fecha" BETWEEN s."fechaInicio" AND s."fechaFin"
  WHERE n."id" = d."inscripcionNinoId"
  ORDER BY s."numero"
  LIMIT 1
);
DELETE FROM "InscripcionDia" WHERE "semanaId" IS NULL;
ALTER TABLE "InscripcionDia" ALTER COLUMN "semanaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InscripcionNino" DROP COLUMN "turno";

-- AlterTable
ALTER TABLE "Temporada" DROP COLUMN "horarioManana",
DROP COLUMN "horarioTarde",
DROP COLUMN "nombrePeriodo",
DROP COLUMN "permiteSemanas",
DROP COLUMN "turnos",
ADD COLUMN     "descuentoHermanos" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "precioColoniaCompleta" INTEGER,
ADD COLUMN     "precioDia" INTEGER,
ALTER COLUMN "permitePorDia" SET DEFAULT false;

-- DropEnum
DROP TYPE "Turno";

-- CreateIndex
CREATE INDEX "InscripcionDia_semanaId_idx" ON "InscripcionDia"("semanaId");

-- AddForeignKey
ALTER TABLE "InscripcionDia" ADD CONSTRAINT "InscripcionDia_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "Semana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Precios de esta edición (se cambian desde Configuración): quincena
-- $130.000, colonia completa $230.000, 10 % de descuento por hermanos.
UPDATE "Semana" SET "nombre" = 'Quincena ' || "numero", "precio" = 130000 WHERE "nombre" = '';
UPDATE "Temporada" SET "precioColoniaCompleta" = 230000;
