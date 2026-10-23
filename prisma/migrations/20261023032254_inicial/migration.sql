-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('MANANA', 'TARDE');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('SEMANAS', 'POR_DIA');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('EN_ESPERA', 'CONFIRMADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Familia" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nino" (
    "id" SERIAL NOT NULL,
    "familiaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" DATE NOT NULL,
    "infoAdicional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsable" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "whatsappAlt" TEXT,
    "email" TEXT,
    "dni" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Responsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NinoResponsable" (
    "ninoId" INTEGER NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "parentesco" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NinoResponsable_pkey" PRIMARY KEY ("ninoId","responsableId")
);

-- CreateTable
CREATE TABLE "Temporada" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "inscripcionAbierta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semana" (
    "id" SERIAL NOT NULL,
    "temporadaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,

    CONSTRAINT "Semana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoEdad" (
    "id" SERIAL NOT NULL,
    "temporadaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "edadMin" INTEGER NOT NULL,
    "edadMax" INTEGER NOT NULL,

    CONSTRAINT "GrupoEdad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "numero" SERIAL NOT NULL,
    "temporadaId" INTEGER NOT NULL,
    "familiaId" INTEGER NOT NULL,
    "responsablePrincipalId" INTEGER NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscripcionNino" (
    "id" SERIAL NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "ninoId" INTEGER NOT NULL,
    "grupoEdadId" INTEGER,
    "edadAlInscribir" INTEGER NOT NULL,
    "turno" "Turno" NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'EN_ESPERA',
    "posibleDuplicado" BOOLEAN NOT NULL DEFAULT false,
    "notasAdmin" TEXT,

    CONSTRAINT "InscripcionNino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscripcionSemana" (
    "inscripcionNinoId" INTEGER NOT NULL,
    "semanaId" INTEGER NOT NULL,

    CONSTRAINT "InscripcionSemana_pkey" PRIMARY KEY ("inscripcionNinoId","semanaId")
);

-- CreateTable
CREATE TABLE "InscripcionDia" (
    "inscripcionNinoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,

    CONSTRAINT "InscripcionDia_pkey" PRIMARY KEY ("inscripcionNinoId","fecha")
);

-- CreateIndex
CREATE INDEX "Nino_familiaId_idx" ON "Nino"("familiaId");

-- CreateIndex
CREATE INDEX "Nino_dni_idx" ON "Nino"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Responsable_whatsapp_key" ON "Responsable"("whatsapp");

-- CreateIndex
CREATE INDEX "NinoResponsable_responsableId_idx" ON "NinoResponsable"("responsableId");

-- CreateIndex
CREATE UNIQUE INDEX "Semana_temporadaId_numero_key" ON "Semana"("temporadaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoEdad_temporadaId_nombre_key" ON "GrupoEdad"("temporadaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_numero_key" ON "Inscripcion"("numero");

-- CreateIndex
CREATE INDEX "Inscripcion_temporadaId_fechaAlta_idx" ON "Inscripcion"("temporadaId", "fechaAlta");

-- CreateIndex
CREATE INDEX "Inscripcion_familiaId_idx" ON "Inscripcion"("familiaId");

-- CreateIndex
CREATE INDEX "Inscripcion_responsablePrincipalId_idx" ON "Inscripcion"("responsablePrincipalId");

-- CreateIndex
CREATE INDEX "InscripcionNino_ninoId_idx" ON "InscripcionNino"("ninoId");

-- CreateIndex
CREATE INDEX "InscripcionNino_grupoEdadId_idx" ON "InscripcionNino"("grupoEdadId");

-- CreateIndex
CREATE INDEX "InscripcionNino_estado_idx" ON "InscripcionNino"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionNino_inscripcionId_ninoId_key" ON "InscripcionNino"("inscripcionId", "ninoId");

-- CreateIndex
CREATE INDEX "InscripcionSemana_semanaId_idx" ON "InscripcionSemana"("semanaId");

-- CreateIndex
CREATE INDEX "InscripcionDia_fecha_idx" ON "InscripcionDia"("fecha");

-- AddForeignKey
ALTER TABLE "Nino" ADD CONSTRAINT "Nino_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NinoResponsable" ADD CONSTRAINT "NinoResponsable_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "Nino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NinoResponsable" ADD CONSTRAINT "NinoResponsable_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Responsable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semana" ADD CONSTRAINT "Semana_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoEdad" ADD CONSTRAINT "GrupoEdad_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_responsablePrincipalId_fkey" FOREIGN KEY ("responsablePrincipalId") REFERENCES "Responsable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionNino" ADD CONSTRAINT "InscripcionNino_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionNino" ADD CONSTRAINT "InscripcionNino_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "Nino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionNino" ADD CONSTRAINT "InscripcionNino_grupoEdadId_fkey" FOREIGN KEY ("grupoEdadId") REFERENCES "GrupoEdad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionSemana" ADD CONSTRAINT "InscripcionSemana_inscripcionNinoId_fkey" FOREIGN KEY ("inscripcionNinoId") REFERENCES "InscripcionNino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionSemana" ADD CONSTRAINT "InscripcionSemana_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "Semana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionDia" ADD CONSTRAINT "InscripcionDia_inscripcionNinoId_fkey" FOREIGN KEY ("inscripcionNinoId") REFERENCES "InscripcionNino"("id") ON DELETE CASCADE ON UPDATE CASCADE;
