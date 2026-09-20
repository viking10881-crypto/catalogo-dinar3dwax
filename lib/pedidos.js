import { getSql } from "./db.js";
import { CONFIG } from "./productos.js";

function formatearNumeroOrden(numero) {
  return `${CONFIG.ordenPrefijo}-${String(numero).padStart(6, "0")}`;
}

export async function crearPedido({ cliente, items, total, comprobanteUrl }) {
  const sql = getSql();
  const [{ n }] = await sql`SELECT nextval('pedidos_numero_seq') AS n`;
  const id = formatearNumeroOrden(n);

  await sql`
    INSERT INTO pedidos (id, cliente_nombre, cliente_cedula, cliente_whatsapp, cliente_ciudad, cliente_direccion, cliente_correo, items, total, estado, comprobante_url)
    VALUES (${id}, ${cliente.nombre}, ${cliente.cedula}, ${cliente.whatsapp}, ${cliente.ciudad}, ${cliente.direccion}, ${cliente.correo || ""}, ${JSON.stringify(items)}, ${total}, 'pendiente', ${comprobanteUrl || ""})
  `;

  return id;
}

export async function obtenerPedido(id) {
  const sql = getSql();
  const filas = await sql`SELECT * FROM pedidos WHERE id = ${id}`;
  return filas[0] || null;
}

export async function actualizarEstadoPedido(id, estado) {
  const sql = getSql();
  await sql`
    UPDATE pedidos SET estado = ${estado}, actualizado_en = now()
    WHERE id = ${id}
  `;
}

export async function guardarEstadoProduccion(id, { estado, info }) {
  const sql = getSql();
  await sql`
    UPDATE pedidos SET produccion_estado = ${estado}, produccion_info = ${JSON.stringify(info)}
    WHERE id = ${id}
  `;
}

export function filaAPedidoPublico(fila) {
  return {
    id: fila.id,
    total: Number(fila.total),
    estado: fila.estado,
    items: fila.items,
    creadoEn: fila.creado_en,
  };
}

function filaAPedidoAdmin(fila) {
  return {
    id: fila.id,
    cliente: {
      nombre: fila.cliente_nombre,
      cedula: fila.cliente_cedula,
      whatsapp: fila.cliente_whatsapp,
      ciudad: fila.cliente_ciudad,
      direccion: fila.cliente_direccion,
      correo: fila.cliente_correo,
    },
    items: fila.items,
    total: Number(fila.total),
    estado: fila.estado,
    comprobanteUrl: fila.comprobante_url,
    produccionEstado: fila.produccion_estado,
    produccionInfo: fila.produccion_info,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

export async function listarPedidos() {
  const sql = getSql();
  const filas = await sql`SELECT * FROM pedidos ORDER BY creado_en DESC`;
  return filas.map(filaAPedidoAdmin);
}

export async function obtenerPedidoAdmin(id) {
  const fila = await obtenerPedido(id);
  return fila ? filaAPedidoAdmin(fila) : null;
}
