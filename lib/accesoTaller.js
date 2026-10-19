import crypto from "node:crypto";

/**
 * Genera el link de entrada directa al taller (dinar-3dwax) para el botón
 * "Taller" del admin: un "pase" HMAC firmado, válido 60s (tiempo de sobra
 * para el redirect, no una sesión), que dinar-3dwax/lib/auth.ts verifica
 * en su proxy. Usa un secreto propio (TALLER_ACCESO_SECRET, configurado
 * igual en ambos proyectos) separado de CATALOGO_INTEGRACION_SECRET (ese
 * es para la integración de pedidos→OT, máquina a máquina; este es para
 * que una persona ya logueada aquí entre allá sin volver a escribir la
 * contraseña del taller).
 */
const DURACION_MS = 60 * 1000;

function secreto() {
  const s = process.env.TALLER_ACCESO_SECRET;
  if (!s) throw new Error("TALLER_ACCESO_SECRET no está configurada");
  return s;
}

function crearPase() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + DURACION_MS })).toString(
    "base64url"
  );
  const firma = crypto.createHmac("sha256", secreto()).update(payload).digest("hex");
  return `${payload}.${firma}`;
}

export function urlAccesoTaller() {
  const base = process.env.DINAR3DWAX_URL_PUBLICA;
  if (!base) throw new Error("DINAR3DWAX_URL_PUBLICA no está configurada");
  return `${base}/?pase=${crearPase()}`;
}
