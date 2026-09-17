import { handleUpload } from "@vercel/blob/client";

/**
 * Endpoint público (sin login): el cliente sube el comprobante de su
 * transferencia durante el checkout, antes de tener un pedido creado.
 * Genera un token para que el navegador suba el archivo directo a Vercel
 * Blob (sin pasar por esta función) — el viejo flujo JSON+base64 llevaba
 * el archivo dentro del body de la petición, y Vercel limita ese body a
 * 4.5 MB, así que cualquier comprobante codificado en base64 arriba de
 * ~3.2 MB fallaba con 413 aunque el mensaje dijera "máx. 8 MB".
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^comprobantes\//.test(pathname)) {
          throw new Error("Ruta de destino inválida");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "application/pdf"],
          maximumSizeInBytes: 20 * 1024 * 1024,
        };
      },
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error("Error generando token de subida de comprobante:", err);
    res.status(400).json({ error: err.message || "No se pudo generar el token de subida" });
  }
}
