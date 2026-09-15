import { put } from "@vercel/blob";

const TIPOS_PERMITIDOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB

/**
 * Endpoint público (sin login): el cliente sube el comprobante de su
 * transferencia durante el checkout, antes de tener un pedido creado. Igual
 * que las subidas del panel, recibe JSON + base64 en vez de binario crudo
 * (ver nota en api/admin/subir-imagen.js sobre por qué).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { contentType, datosBase64 } = req.body || {};

    const extension = TIPOS_PERMITIDOS[contentType];
    if (!extension) {
      res.status(400).json({ error: "Formato no soportado. Usa JPG, PNG o PDF." });
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
      res.status(400).json({ error: "El archivo no puede superar 8 MB" });
      return;
    }

    const nombreArchivo = `comprobantes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const blob = await put(nombreArchivo, buffer, {
      access: "public",
      contentType,
    });

    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error("Error subiendo comprobante:", err);
    res.status(500).json({ error: "No se pudo subir el comprobante" });
  }
}
