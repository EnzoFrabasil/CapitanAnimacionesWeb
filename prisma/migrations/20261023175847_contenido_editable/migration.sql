-- CreateTable
CREATE TABLE "ContenidoSitio" (
    "id" SERIAL NOT NULL,
    "datos" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContenidoSitio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imagen" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "tamano" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContenidoSitio_creadoEn_idx" ON "ContenidoSitio"("creadoEn");
