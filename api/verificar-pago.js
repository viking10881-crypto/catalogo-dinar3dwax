import { obtenerPedido, filaAPedidoPublico } from "../lib/pedidos.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const ordenId = req.query.orden;
  if (!ordenId) {
    res.status(400).json({ error: "Falta el parámetro 'orden'" });
    return;
  }

  try {
    const pedido = await obtenerPedido(ordenId);
    if (!pedido) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }
    res.status(200).json(filaAPedidoPublico(pedido));
  } catch (err) {
    console.error("Error verificando pago:", err);
    res.status(500).json({ error: "Error consultando el pedido" });
  }
}
