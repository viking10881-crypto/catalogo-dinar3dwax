import { put } from "@vercel/blob";
import { requiereAdmin } from "../lib/adminAuth.js";

const TIPOS_PERMITIDOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB

/**
 * Sube UNA imagen y devuelve su URL pública; un producto puede tener varias
 * (se llama una vez por archivo). El archivo llega como JSON
 * { contentType, datosBase64 } en vez de binario crudo: en las funciones
 * serverless de Vercel (sin Next.js) el cuerpo de content-types no
 * reconocidos no queda garantizado como stream legible.
 */
export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { contentType, datosBase64 } = req.body || {};
    const referencia = String(req.query.referencia || "producto").trim().toUpperCase() || "PRODUCTO";

    const extension = TIPOS_PERMITIDOS[contentType];
    if (!extension) {
      res.status(400).json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." });
      return;
    }
    if (!datosBase64) {
      res.status(400).json({ error: "El archivo está vacío" });
      return;
    }

    const buffer = Buffer.from(datosBase64, "base64");
    if (buffer.length === 0) {
      res.status(400).json({ error: "El archivo está vacío" });
      return;
    }
    if (buffer.length > TAMANO_MAXIMO) {
      res.status(400).json({ error: "La imagen no puede superar 8 MB" });
      return;
    }

    const nombreArchivo = `productos/${referencia}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
    const blob = await put(nombreArchivo, buffer, {
      access: "public",
      contentType,
    });

    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    res.status(500).json({ error: "No se pudo subir la imagen" });
  }
}
