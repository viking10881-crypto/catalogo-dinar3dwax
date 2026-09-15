import { put, del } from "@vercel/blob";
import { requiereAdmin } from "../lib/adminAuth.js";
import { esUrlDeNuestroBlob } from "../lib/blob.js";

const TAMANO_MAXIMO = 20 * 1024 * 1024; // 20 MB

/**
 * Igual que subir-imagen.js: el archivo llega como JSON { datosBase64 } en
 * vez de binario crudo, porque el cuerpo de un content-type no reconocido
 * (los .stl no tienen un MIME estándar fiable en los navegadores) no queda
 * garantizado como stream legible en una función serverless sin Next.js.
 */
export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { datosBase64, nombreOriginal, reemplazaUrl } = req.body || {};
    const referencia = String(req.query.referencia || "producto").trim().toUpperCase() || "PRODUCTO";

    if (!/\.stl$/i.test(String(nombreOriginal || ""))) {
      res.status(400).json({ error: "El archivo debe tener extensión .stl" });
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
      res.status(400).json({ error: "El archivo STL no puede superar 20 MB" });
      return;
    }

    const nombreArchivo = `modelos-stl/${referencia}-${Date.now()}.stl`;
    const blob = await put(nombreArchivo, buffer, {
      access: "public",
      contentType: "model/stl",
    });

    if (esUrlDeNuestroBlob(reemplazaUrl)) {
      try {
        await del(reemplazaUrl);
      } catch (err) {
        console.error("No se pudo borrar el STL anterior:", err);
      }
    }

    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error("Error subiendo STL:", err);
    res.status(500).json({ error: "No se pudo subir el archivo STL" });
  }
}
