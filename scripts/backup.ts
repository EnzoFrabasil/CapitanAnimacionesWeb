// Genera un backup completo de la base en la carpeta backups/ (npm run db:backup).
// Usa la conexión de .env. La carpeta backups/ no se sube al repositorio:
// tiene datos personales.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generarBackup, nombreArchivoBackup } from "../src/lib/admin/backup";

async function main() {
  const backup = await generarBackup();
  mkdirSync("backups", { recursive: true });
  const ruta = join("backups", nombreArchivoBackup());
  writeFileSync(ruta, JSON.stringify(backup, null, 1));
  console.log(`Backup guardado en ${ruta}`);
  console.log(backup.cantidades);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("No se pudo generar el backup:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
