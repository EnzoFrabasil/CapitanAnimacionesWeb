-- Paquetes de precio (por ejemplo "Colonia completa" = Quincena 1 + 2) en lugar de
-- "todas las opciones del horario", y precio congelado al confirmar.

-- 1) Tablas nuevas
CREATE TABLE "Paquete" (
    "id" SERIAL NOT NULL,
    "temporadaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaqueteOpcion" (
    "paqueteId" INTEGER NOT NULL,
    "semanaId" INTEGER NOT NULL,

    CONSTRAINT "PaqueteOpcion_pkey" PRIMARY KEY ("paqueteId","semanaId")
);

CREATE INDEX "Paquete_temporadaId_idx" ON "Paquete"("temporadaId");
CREATE INDEX "PaqueteOpcion_semanaId_idx" ON "PaqueteOpcion"("semanaId");

ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaqueteOpcion" ADD CONSTRAINT "PaqueteOpcion_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaqueteOpcion" ADD CONSTRAINT "PaqueteOpcion_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "Semana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) El precio de "colonia completa" pasa a ser un paquete con todas las opciones
--    activas de cada horario que tenía más de una (así el precio no cambia).
DO $$
DECLARE
  g RECORD;
  nuevo INTEGER;
BEGIN
  FOR g IN
    SELECT s."temporadaId", s."horaInicio", s."horaFin", t."precioColoniaCompleta" AS precio
    FROM "Semana" s
    JOIN "Temporada" t ON t."id" = s."temporadaId"
    WHERE s."activa" AND t."precioColoniaCompleta" IS NOT NULL
    GROUP BY s."temporadaId", s."horaInicio", s."horaFin", t."precioColoniaCompleta"
    HAVING COUNT(*) > 1
  LOOP
    INSERT INTO "Paquete" ("temporadaId", "nombre", "precio") VALUES (g."temporadaId", 'Colonia completa', g.precio)
    RETURNING "id" INTO nuevo;
    INSERT INTO "PaqueteOpcion" ("paqueteId", "semanaId")
    SELECT nuevo, s."id" FROM "Semana" s
    WHERE s."temporadaId" = g."temporadaId" AND s."horaInicio" = g."horaInicio" AND s."horaFin" = g."horaFin" AND s."activa";
  END LOOP;
END $$;

-- 3) Precio congelado de los que ya están confirmados (sin precio acordado):
--    el paquete si eligieron exactamente sus opciones; si no, la suma de opciones;
--    por días sueltos, precio por día × días (si hay precio por día).
ALTER TABLE "InscripcionNino" ADD COLUMN "precioConfirmado" INTEGER;

WITH elegidas AS (
  SELECT ins."inscripcionNinoId" AS id, array_agg(ins."semanaId" ORDER BY ins."semanaId") AS ids, SUM(s."precio") AS suma
  FROM "InscripcionSemana" ins JOIN "Semana" s ON s."id" = ins."semanaId"
  GROUP BY ins."inscripcionNinoId"
),
paquetes AS (
  SELECT p."id", p."precio", array_agg(po."semanaId" ORDER BY po."semanaId") AS ids
  FROM "Paquete" p JOIN "PaqueteOpcion" po ON po."paqueteId" = p."id"
  GROUP BY p."id", p."precio"
)
UPDATE "InscripcionNino" n
SET "precioConfirmado" = COALESCE((SELECT MIN(p."precio") FROM paquetes p WHERE p.ids = e.ids), e.suma)
FROM elegidas e
WHERE e.id = n."id" AND n."estado" = 'CONFIRMADO' AND n."modalidad" = 'SEMANAS' AND n."precioAcordado" IS NULL;

UPDATE "InscripcionNino" n
SET "precioConfirmado" = t."precioDia" * (SELECT COUNT(*) FROM "InscripcionDia" d WHERE d."inscripcionNinoId" = n."id")
FROM "Inscripcion" i JOIN "Temporada" t ON t."id" = i."temporadaId"
WHERE i."id" = n."inscripcionId" AND n."estado" = 'CONFIRMADO' AND n."modalidad" = 'POR_DIA'
  AND n."precioAcordado" IS NULL AND t."precioDia" IS NOT NULL;

-- 4) El campo viejo ya no se usa.
ALTER TABLE "Temporada" DROP COLUMN "precioColoniaCompleta";
