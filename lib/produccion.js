import { obtenerProducto } from "./productos.js";
import { obtenerConfiguracion } from "./configuracion.js";

/**
 * Envía un pedido aprobado al taller (dinar-3dwax) como uno o más OT — ese
 * sistema modela "una pieza física = un OT", así que un pedido con varias
 * unidades/referencias se traduce en varias piezas. Usa un secreto
 * compartido (no hay login entre apps) y es idempotente del lado del taller
 * (mismo origenCatalogoId no duplica), así que reintentar aquí es seguro.
 */

function truncarPesoCera(pesoOro18k, configuracion) {
  return Math.trunc((pesoOro18k / configuracion.divisorPesoOro18k) * 100) / 100;
}

async function construirPiezas(pedido) {
  const configuracion = await obtenerConfiguracion();
  const piezas = [];
  const omitidos = [];

  for (let i = 0; i < pedido.items.length; i++) {
    const item = pedido.items[i];
    let descripcion, pesoCera, metalNombre, archivoStlUrl, archivoStlNombre, imagenUrl;

    if (item.referencia === "PERSONALIZADO") {
      descripcion = `Pieza personalizada${item.talla ? ` (talla ${item.talla})` : ""}`;
      pesoCera = item.peso ? truncarPesoCera(Number(item.peso), configuracion) : 0;
      metalNombre = "Oro 18k";
      archivoStlUrl = null;
      archivoStlNombre = null;
      imagenUrl = null;
    } else {
      const producto = await obtenerProducto(item.referencia);
      if (!producto) {
        omitidos.push(`${item.referencia} (ya no existe en el catálogo)`);
        continue;
      }
      descripcion = `${producto.referencia} · ${producto.nombre}${item.talla ? ` (talla ${item.talla})` : ""}`;
      pesoCera = producto.pesoCera;
      metalNombre = producto.materialTipo;
      archivoStlUrl = producto.modeloStl || null;
      archivoStlNombre = archivoStlUrl ? `${producto.referencia}.stl` : null;
      // Foto de portada (la primera imagen del producto), para que el taller
      // la muestre de referencia en la cuenta de cobro del cliente final.
      imagenUrl = (producto.imagenes && producto.imagenes[0]) || null;
    }

    if (!(pesoCera > 0)) {
      omitidos.push(`${descripcion} (sin peso de cera configurado)`);
      continue;
    }

    const cantidad = Math.max(1, Number(item.cantidad) || 1);
    for (let unidad = 1; unidad <= cantidad; unidad++) {
      piezas.push({
        origenCatalogoId: `${pedido.id}#${i}-${unidad}`,
        descripcionPieza: cantidad > 1 ? `${descripcion} (${unidad}/${cantidad})` : descripcion,
        pesoCera,
        metalNombre,
        precioTotal: Number(item.precioUnitario) || 0,
        imagenUrl,
        archivoStlUrl,
        archivoStlNombre,
      });
    }
  }

  return { piezas, omitidos };
}

export async function enviarAProduccion(pedido) {
  if (!process.env.DINAR3DWAX_API_URL || !process.env.CATALOGO_INTEGRACION_SECRET) {
    return { estado: "error", info: { error: "La integración con el taller no está configurada" } };
  }

  const { piezas, omitidos } = await construirPiezas(pedido);
  if (piezas.length === 0) {
    return {
      estado: "error",
      info: { error: "Ningún ítem del pedido tiene datos suficientes para crear un OT", omitidos },
    };
  }

  try {
    const respuesta = await fetch(`${process.env.DINAR3DWAX_API_URL}/api/pedidos-externos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-integracion-secret": process.env.CATALOGO_INTEGRACION_SECRET,
      },
      body: JSON.stringify({
        cliente: {
          nombre: pedido.cliente.nombre,
          ciudad: pedido.cliente.ciudad,
          telefono: pedido.cliente.whatsapp,
        },
        piezas,
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      return { estado: "error", info: { error: datos.error || "El taller respondió con un error" } };
    }

    return {
      estado: "enviado",
      info: { ots: datos.resultados, omitidos, enviadoEn: new Date().toISOString() },
    };
  } catch (err) {
    console.error("Error enviando pedido a producción:", err);
    return { estado: "error", info: { error: "No se pudo contactar al taller (dinar-3dwax)" } };
  }
}
