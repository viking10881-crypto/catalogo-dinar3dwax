import { crearPedido } from "../lib/pedidos.js";
import { precioProducto } from "../lib/productos.js";
import { obtenerConfiguracion, calcularPrecioServicio } from "../lib/configuracion.js";
import { esUrlDeNuestroBlob } from "../lib/blob.js";

/**
 * Revalida cada línea del carrito contra el catálogo del servidor.
 * Nunca confiamos en el precio que envía el navegador.
 */
async function validarItems(items, configuracion) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  return Promise.all(
    items.map(async (item) => {
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        throw new Error("Cantidad inválida");
      }

      if (item.referencia === "PERSONALIZADO") {
        const peso = Number(item.peso);
        if (!(peso > 0)) throw new Error("Peso inválido en pieza personalizada");
        const precioUnitario = calcularPrecioServicio(peso, configuracion);
        return { ...item, cantidad, precioUnitario };
      }

      const precioUnitario = await precioProducto(item.referencia);
      if (precioUnitario === null) {
        throw new Error(`Referencia desconocida: ${item.referencia}`);
      }
      return { ...item, cantidad, precioUnitario };
    })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { cliente, items, comprobanteUrl } = req.body || {};

    if (!cliente || !cliente.nombre || !cliente.cedula || !cliente.whatsapp || !cliente.ciudad || !cliente.direccion) {
      res.status(400).json({ error: "Faltan datos de entrega" });
      return;
    }
    if (!esUrlDeNuestroBlob(comprobanteUrl)) {
      res.status(400).json({ error: "Falta subir el comprobante de la transferencia" });
      return;
    }

    const configuracion = await obtenerConfiguracion();
    const itemsValidados = await validarItems(items, configuracion);
    const total = itemsValidados.reduce((t, i) => t + i.precioUnitario * i.cantidad, 0);

    const ordenId = await crearPedido({ cliente, items: itemsValidados, total, comprobanteUrl });

    res.status(200).json({ ordenId });
  } catch (err) {
    console.error("Error creando pedido:", err);
    res.status(400).json({ error: err.message || "No se pudo crear el pedido" });
  }
}
