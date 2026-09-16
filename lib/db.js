import { neon } from "@neondatabase/serverless";

let _sql;

/**
 * Cliente Neon en modo lazy: si se crea a nivel de módulo, un build o import
 * sin DATABASE_URL configurada (p. ej. antes de aprovisionar la integración)
 * rompería el arranque de la función.
 */
export function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no está configurada");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
