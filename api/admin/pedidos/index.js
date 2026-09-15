import { requiereAdmin } from "../../lib/adminAuth.js";
import { listarPedidos } from "../../lib/pedidos.js";

export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const pedidos = await listarPedidos();
    res.status(200).json(pedidos);
  } catch (err) {
    console.error("Error listando pedidos:", err);
    res.status(500).json({ error: "No se pudo cargar el listado de pedidos" });
  }
}
