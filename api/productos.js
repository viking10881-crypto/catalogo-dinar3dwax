import { listarProductos } from "./lib/productos.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const productos = await listarProductos();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(productos);
  } catch (err) {
    console.error("Error listando productos:", err);
    res.status(500).json({ error: "No se pudo cargar el catálogo" });
  }
}
