import { borrarCookieSesion } from "../lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  borrarCookieSesion(req, res);
  res.status(200).json({ ok: true });
}
