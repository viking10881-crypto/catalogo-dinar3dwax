import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL. Ejecuta `vercel env pull .env.local --yes` primero.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  const sentencias = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentencia of sentencias) {
    await sql.query(sentencia);
    console.log("OK:", sentencia.split("\n")[0].slice(0, 60));
  }

  console.log("Migración completada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
