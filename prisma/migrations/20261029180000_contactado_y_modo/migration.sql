-- CreateEnum
CREATE TYPE "ModoInscripcion" AS ENUM ('PREINSCRIPCION', 'INSCRIPCION');

-- AlterTable
ALTER TABLE "Temporada" ADD COLUMN     "modoInscripcion" "ModoInscripcion" NOT NULL DEFAULT 'PREINSCRIPCION';

-- CreateTable
CREATE TABLE "ContactoFamilia" (
    "familiaId" INTEGER NOT NULL,
    "temporadaId" INTEGER NOT NULL,
    "contactadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioNombre" TEXT,

    CONSTRAINT "ContactoFamilia_pkey" PRIMARY KEY ("familiaId","temporadaId")
);

-- CreateIndex
CREATE INDEX "ContactoFamilia_temporadaId_idx" ON "ContactoFamilia"("temporadaId");

-- AddForeignKey
ALTER TABLE "ContactoFamilia" ADD CONSTRAINT "ContactoFamilia_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactoFamilia" ADD CONSTRAINT "ContactoFamilia_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

