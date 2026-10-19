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

/**
 * A diferencia de listarPagos()/listarPagosDeTrabajador() (que solo
 * necesitan el nombre para una fila de tabla), esta trae también los
 * datos del colaborador que necesita el comprobante imprimible
 * (documento, banco) para no tener que hacer una segunda consulta aparte.
 */
export async function obtenerPago(id) {
  const sql = getSql();
  const filas = await sql`
    SELECT
      p.*,
      t.nombre AS trabajador_nombre,
      t.correo AS trabajador_correo,
      t.tipo_documento AS trabajador_tipo_documento,
      t.documento AS trabajador_documento,
      t.banco_nombre AS trabajador_banco_nombre,
      t.banco_numero_cuenta AS trabajador_banco_numero_cuenta,
      t.banco_tipo_cuenta AS trabajador_banco_tipo_cuenta
    FROM pagos_trabajadores p
    JOIN trabajadores t ON t.id = p.trabajador_id
    WHERE p.id = ${id}
  `;
  if (!filas[0]) return null;
  return {
    ...filaAPago(filas[0]),
    trabajadorCorreo: filas[0].trabajador_correo,
    trabajadorTipoDocumento: filas[0].trabajador_tipo_documento,
    trabajadorDocumento: filas[0].trabajador_documento,
    trabajadorBancoNombre: filas[0].trabajador_banco_nombre,
    trabajadorBancoNumeroCuenta: filas[0].trabajador_banco_numero_cuenta,
    trabajadorBancoTipoCuenta: filas[0].trabajador_banco_tipo_cuenta,
  };
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
