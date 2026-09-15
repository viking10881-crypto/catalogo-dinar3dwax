import { requiereAdmin } from "../../lib/adminAuth.js";
import { obtenerPedidoAdmin, actualizarEstadoPedido } from "../../lib/pedidos.js";

const ESTADOS_VALIDOS = ["pendiente", "aprobado", "rechazado"];

export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  const id = String(req.query.id || "");

  if (req.method === "PUT") {
    try {
      const estado = String((req.body || {}).estado || "");
      if (!ESTADOS_VALIDOS.includes(estado)) {
        res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
        return;
      }

      const pedido = await obtenerPedidoAdmin(id);
      if (!pedido) {
        res.status(404).json({ error: "Pedido no encontrado" });
        return;
      }

      await actualizarEstadoPedido(id, estado);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando pedido:", err);
      res.status(500).json({ error: "No se pudo actualizar el pedido" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
