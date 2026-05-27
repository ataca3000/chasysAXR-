import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const COMPONENTS_DIR = "./apps/industrial-control/src/ui/components";

function sanitizeFiles() {
  console.log("🧹 Iniciando limpieza de archivos en components...");
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.error("❌ No se encontró la carpeta de componentes.");
    return;
  }
  const files = fs
    .readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith(".tsx"));

  files.forEach((file) => {
    const filePath = path.join(COMPONENTS_DIR, file);
    let content = fs.readFileSync(filePath, "utf8");

    // Cortamos el archivo después de la última llave de cierre real para evitar duplicados pegados al final
    const lastClosingBrace = content.lastIndexOf("}");
    if (lastClosingBrace !== -1 && lastClosingBrace < content.length - 5) {
      const newContent = content.substring(0, lastClosingBrace + 1);
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${file} limpiado.`);
    }
  });
}

function pushToRepo() {
  console.log("🚀 Sincronizando con ENSANBLE-CREATORS...");
  try {
    execSync("git add .");
    // Intentamos hacer el commit, si no hay cambios no pasa nada
    try {
      execSync('git commit -m "chore: auto-sanitize components and sync repo"');
    } catch (e) {
      console.log("ℹ️ No hay cambios nuevos para commitear.");
    }
    const branch = execSync("git branch --show-current").toString().trim();
    execSync(`git push origin ${branch}`);
    console.log(`🎉 ¡Todo arriba en la rama ${branch}!`);
  } catch (error) {
    console.error("❌ Error en Git:", error.message);
  }
}

sanitizeFiles();
pushToRepo();
