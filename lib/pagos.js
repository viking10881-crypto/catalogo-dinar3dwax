import { getSql } from "./db.js";

function filaAPago(fila) {
  return {
    id: fila.id,
    trabajadorId: fila.trabajador_id,
    trabajadorNombre: fila.trabajador_nombre,
    concepto: fila.concepto,
    monto: Number(fila.monto),
    fecha: fila.fecha,
    metodoPago: fila.metodo_pago,
    notas: fila.notas,
    creadoEn: fila.creado_en,
  };
}

/**
 * Trae el nombre del trabajador junto con cada pago (join) para no tener que
 * resolverlo aparte en el admin solo para mostrarlo en la tabla.
 */
export async function listarPagos() {
  const sql = getSql();
  const filas = await sql`
    SELECT p.*, t.nombre AS trabajador_nombre
    FROM pagos_trabajadores p
    JOIN trabajadores t ON t.id = p.trabajador_id
    ORDER BY p.fecha DESC, p.id DESC
  `;
  return filas.map(filaAPago);
}

export async function listarPagosDeTrabajador(trabajadorId) {
  const sql = getSql();
  const filas = await sql`
    SELECT p.*, t.nombre AS trabajador_nombre
    FROM pagos_trabajadores p
    JOIN trabajadores t ON t.id = p.trabajador_id
    WHERE p.trabajador_id = ${trabajadorId}
    ORDER BY p.fecha DESC, p.id DESC
  `;
  return filas.map(filaAPago);
}

export async function obtenerPago(id) {
  const sql = getSql();
  const filas = await sql`
    SELECT p.*, t.nombre AS trabajador_nombre
    FROM pagos_trabajadores p
    JOIN trabajadores t ON t.id = p.trabajador_id
    WHERE p.id = ${id}
  `;
  return filas[0] ? filaAPago(filas[0]) : null;
}

export async function crearPago(datos) {
  const sql = getSql();
  const filas = await sql`
    INSERT INTO pagos_trabajadores (trabajador_id, concepto, monto, fecha, metodo_pago, notas)
    VALUES (${datos.trabajadorId}, ${datos.concepto}, ${datos.monto}, ${datos.fecha}, ${datos.metodoPago}, ${datos.notas})
    RETURNING id
  `;
  return filas[0].id;
}

export async function eliminarPago(id) {
  const sql = getSql();
  await sql`DELETE FROM pagos_trabajadores WHERE id = ${id}`;
}
