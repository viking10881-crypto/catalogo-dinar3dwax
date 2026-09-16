import crypto from "node:crypto";

const NOMBRE_COOKIE = "admin_session";
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

function secreto() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET no está configurada");
  return s;
}

function firmar(payload) {
  return crypto.createHmac("sha256", secreto()).update(payload).digest("hex");
}

export function crearTokenSesion() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + DURACION_MS })).toString(
    "base64url"
  );
  return `${payload}.${firmar(payload)}`;
}

function tokenValido(token) {
  if (!token || !token.includes(".")) return false;
  const [payload, firma] = token.split(".");
  const esperada = firmar(payload);
  const firmaBuf = Buffer.from(firma || "");
  const esperadaBuf = Buffer.from(esperada);
  if (firmaBuf.length !== esperadaBuf.length) return false;
  if (!crypto.timingSafeEqual(firmaBuf, esperadaBuf)) return false;

  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof datos.exp === "number" && datos.exp > Date.now();
  } catch {
    return false;
  }
}

function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  const partes = cabecera.split(";").map((p) => p.trim());
  for (const parte of partes) {
    const idx = parte.indexOf("=");
    if (idx === -1) continue;
    if (parte.slice(0, idx) === nombre) return decodeURIComponent(parte.slice(idx + 1));
  }
  return null;
}

function esHttps(req) {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview" ||
    req.headers["x-forwarded-proto"] === "https"
  );
}

export function establecerCookieSesion(req, res, token) {
  const atributos = [
    `${NOMBRE_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${Math.floor(DURACION_MS / 1000)}`,
  ];
  if (esHttps(req)) atributos.push("Secure");
  res.setHeader("Set-Cookie", atributos.join("; "));
}

export function borrarCookieSesion(req, res) {
  const atributos = [`${NOMBRE_COOKIE}=`, "HttpOnly", "Path=/", "SameSite=Strict", "Max-Age=0"];
  if (esHttps(req)) atributos.push("Secure");
  res.setHeader("Set-Cookie", atributos.join("; "));
}

export function sesionValida(req) {
  return tokenValido(leerCookie(req, NOMBRE_COOKIE));
}

/**
 * Devuelve true si hay sesión válida; si no, responde 401 y devuelve false.
 * Usar al inicio de cada endpoint protegido: `if (!requiereAdmin(req, res)) return;`
 */
export function requiereAdmin(req, res) {
  if (sesionValida(req)) return true;
  res.status(401).json({ error: "No autorizado" });
  return false;
}
