import { obtenerConfiguracion } from "../lib/configuracion.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const configuracion = await obtenerConfiguracion();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(configuracion);
  } catch (err) {
    console.error("Error obteniendo configuración:", err);
    res.status(500).json({ error: "No se pudo cargar la configuración" });
  }
}
