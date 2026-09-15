import { del } from "@vercel/blob";
import { requiereAdmin } from "../lib/adminAuth.js";
import { esUrlDeNuestroBlob } from "../lib/blob.js";

/**
 * Borra una imagen del storage cuando el admin la quita de la galería de un
 * producto (el navegador no puede borrar del Blob directamente: requiere el
 * token de escritura, que solo vive en el servidor).
 */
export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { url } = req.body || {};
    if (!esUrlDeNuestroBlob(url)) {
      res.status(400).json({ error: "URL inválida" });
      return;
    }
    await del(url);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error borrando imagen:", err);
    res.status(500).json({ error: "No se pudo borrar la imagen" });
  }
}
