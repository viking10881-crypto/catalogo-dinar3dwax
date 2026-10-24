import { handleUpload } from "@vercel/blob/client";
import { validarSolicitudPublica, crearSolicitudDiseno } from "../lib/solicitudesDiseno.js";
import { enviarAvisoSolicitudDiseno } from "../lib/correo.js";

/**
 * Endpoint público (sin login) de los formularios "Solicita tu diseño" y
 * "Cotizar impresión" de index.html. Una sola función atiende dos cosas,
 * para no gastar otra de las 12 que permite el plan Hobby de Vercel:
 *  - el token de subida directa a Blob del archivo (referencia de diseño o
 *    STL para imprimir; el body trae `type: "blob.generate-client-token"`,
 *    lo manda @vercel/blob/client)
 *  - crear la solicitud con los datos del formulario (de diseño o de
 *    impresión, según body.tipoSolicitud)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = req.body || {};

  if (typeof body.type === "string" && body.type.startsWith("blob.")) {
    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!/^solicitudes-diseno\//.test(pathname)) {
            throw new Error("Ruta de destino inválida");
          }
          // Archivos para "Impresión STL": STL/3DM/OBJ/3MF no tienen un
          // content-type fijo entre navegadores, así que se valida por
          // extensión (y se aceptan ZIP para mandar varias piezas juntas).
          if (/^solicitudes-diseno\/stl\//.test(pathname)) {
            if (!/\.(stl|3dm|obj|3mf|zip)$/i.test(pathname)) {
              throw new Error("El archivo debe ser STL, 3DM, OBJ, 3MF o ZIP");
            }
            return { maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: true };
          }
          return {
            allowedContentTypes: ["image/jpeg", "image/png", "application/pdf"],
            maximumSizeInBytes: 20 * 1024 * 1024,
            addRandomSuffix: true,
          };
        },
      });
      res.status(200).json(jsonResponse);
    } catch (err) {
      console.error("Error generando token de subida de referencia de diseño:", err);
      res.status(400).json({ error: err.message || "No se pudo generar el token de subida" });
    }
    return;
  }

  // Campo trampa: invisible para personas, los bots que llenan todo lo
  // completan. Se responde "ok" para no darles pistas.
  if (body.sitioWeb) {
    res.status(200).json({ ok: true });
    return;
  }

  const { datos, errores } = validarSolicitudPublica(body);
  if (errores.length > 0) {
    res.status(400).json({ error: errores.join(". ") });
    return;
  }

  let solicitud;
  try {
    solicitud = await crearSolicitudDiseno(datos);
  } catch (err) {
    console.error("Error guardando solicitud de diseño:", err);
    res.status(500).json({ error: "No se pudo enviar tu solicitud. Intenta de nuevo." });
    return;
  }

  // Si el correo falla la solicitud igual quedó guardada y se ve en el
  // panel: no se le muestra error al cliente por eso.
  try {
    await enviarAvisoSolicitudDiseno(solicitud);
  } catch (err) {
    console.error("Solicitud de diseño guardada pero no se pudo avisar por correo:", err);
  }

  res.status(201).json({ ok: true, id: solicitud.id });
}
