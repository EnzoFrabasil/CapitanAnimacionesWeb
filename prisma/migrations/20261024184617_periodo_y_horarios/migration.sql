-- AlterTable
ALTER TABLE "Temporada" ADD COLUMN     "horarioManana" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "horarioTarde" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nombrePeriodo" TEXT NOT NULL DEFAULT 'Semana';

-- Esta edición se organiza por quincenas y el turno mañana es de 8:30 a 12:30.
-- Se cambia desde Configuración.
UPDATE "Temporada" SET "nombrePeriodo" = 'Quincena', "horarioManana" = '8:30 a 12:30 hs';
