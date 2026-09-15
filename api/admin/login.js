import crypto from "node:crypto";
import { crearTokenSesion, establecerCookieSesion } from "../lib/adminAuth.js";

function contraseñaValida(recibida) {
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada) throw new Error("ADMIN_PASSWORD no está configurada");
  const a = Buffer.from(String(recibida || ""));
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { password } = req.body || {};
    if (!contraseñaValida(password)) {
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }
    establecerCookieSesion(req, res, crearTokenSesion());
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error en login de admin:", err);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
}
