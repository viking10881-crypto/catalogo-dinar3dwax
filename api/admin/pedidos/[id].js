import { requiereAdmin } from "../../lib/adminAuth.js";
import { obtenerPedidoAdmin, actualizarEstadoPedido, guardarEstadoProduccion } from "../../lib/pedidos.js";
import { enviarAProduccion } from "../../lib/produccion.js";

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

      let produccion = null;
      if (estado === "aprobado") {
        produccion = await enviarAProduccion(pedido);
        await guardarEstadoProduccion(id, produccion);
      }

      res.status(200).json({ ok: true, produccion });
    } catch (err) {
      console.error("Error actualizando pedido:", err);
      res.status(500).json({ error: "No se pudo actualizar el pedido" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
