import { crearPedido } from "../lib/pedidos.js";
import { obtenerProducto } from "../lib/productos.js";
import { obtenerConfiguracion, calcularPrecioServicio } from "../lib/configuracion.js";
import { esUrlDeNuestroBlob } from "../lib/blob.js";

/**
 * Mismas reglas de formato que js/checkout.js (validación en el cliente es
 * solo UX; esta es la que de verdad impide guardar datos mal formados).
 * "direccion" no exige solo letras (ahí es normal que lleguen números y
 * letras juntos), pero sí bloquea los caracteres de HTML/JS (<, >, comillas,
 * backslash): este pedido se muestra tal cual en /admin/pedidos.html, así
 * que cualquier campo del cliente que llegue hasta ahí sin poder cerrarse
 * en una etiqueta es una capa extra de defensa además del escape al
 * renderizar (ver escaparHtml en admin/js/admin.js).
 */
const SOLO_LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
const SOLO_NUMEROS = /^[0-9]+$/;
const DIRECCION_VALIDA = /^[\p{L}\p{N}\s#°.,'-]+$/u;
const CORREO_VALIDO = /^[^\s@<>"'\\]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$/;
const TALLA_VALIDA = /^[\p{L}\p{N}\s.-]{1,20}$/u;

function validarCliente(cliente) {
  if (!cliente || !cliente.nombre || !cliente.cedula || !cliente.whatsapp || !cliente.ciudad || !cliente.direccion) {
    return "Faltan datos de entrega";
  }
  if (!SOLO_LETRAS.test(cliente.nombre)) return "El nombre solo puede tener letras";
  if (!SOLO_LETRAS.test(cliente.ciudad)) return "La ciudad solo puede tener letras";
  if (!SOLO_NUMEROS.test(cliente.cedula)) return "La cédula solo puede tener números";
  if (!SOLO_NUMEROS.test(cliente.whatsapp)) return "El WhatsApp solo puede tener números";
  if (!DIRECCION_VALIDA.test(cliente.direccion)) return "La dirección tiene caracteres no permitidos";
  if (cliente.correo && !CORREO_VALIDO.test(cliente.correo)) return "El correo no es válido";
  return null;
}

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

      // "talla" nunca es obligatoria; si viene, se valida sin importar el
      // tipo de ítem — es lo único de "item" que el navegador realmente
      // aporta (el resto se recalcula acá o es fijo). El admin la muestra
      // tal cual en /admin/pedidos.html, así que no puede llevar HTML.
      const talla = item.talla ? String(item.talla) : "";
      if (talla && !TALLA_VALIDA.test(talla)) {
        throw new Error("Talla inválida");
      }

      if (item.referencia === "PERSONALIZADO") {
        const peso = Number(item.peso);
        if (!(peso > 0)) throw new Error("Peso inválido en pieza personalizada");
        const precioUnitario = calcularPrecioServicio(peso, configuracion);
        // Nunca se confía en un "nombre" mandado por el cliente para esta
        // pieza: no hace falta uno (no es un producto del catálogo), así
        // que se fija un texto propio en vez de guardar lo que venga.
        return { referencia: item.referencia, cantidad, talla, peso, precioUnitario, nombre: "Pieza personalizada" };
      }

      const producto = await obtenerProducto(item.referencia);
      if (!producto) {
        throw new Error(`Referencia desconocida: ${item.referencia}`);
      }
      // Ídem: el nombre que se guarda y se muestra en el admin es siempre
      // el del catálogo (server-side), nunca el que mande el navegador.
      return {
        referencia: producto.referencia,
        nombre: producto.nombre,
        cantidad,
        talla,
        precioUnitario: producto.precioBase,
      };
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

    const errorCliente = validarCliente(cliente);
    if (errorCliente) {
      res.status(400).json({ error: errorCliente });
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
