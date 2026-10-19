import { getSql } from "./db.js";

function filaATrabajador(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    telefono: fila.telefono,
    tipoDocumento: fila.tipo_documento,
    documento: fila.documento,
    correo: fila.correo,
    direccion: fila.direccion,
    fotoUrl: fila.foto_url,
    bancoNombre: fila.banco_nombre,
    bancoNumeroCuenta: fila.banco_numero_cuenta,
    bancoTipoCuenta: fila.banco_tipo_cuenta,
    notas: fila.notas,
    activo: fila.activo,
    creadoEn: fila.creado_en,
  };
}

export async function listarTrabajadores() {
  const sql = getSql();
  const filas = await sql`SELECT * FROM trabajadores ORDER BY activo DESC, nombre`;
  return filas.map(filaATrabajador);
}

export async function obtenerTrabajador(id) {
  const sql = getSql();
  const filas = await sql`SELECT * FROM trabajadores WHERE id = ${id}`;
  return filas[0] ? filaATrabajador(filas[0]) : null;
}

export async function crearTrabajador(datos) {
  const sql = getSql();
  const filas = await sql`
    INSERT INTO trabajadores (
      nombre, rol, telefono, tipo_documento, documento, correo, direccion,
      foto_url, banco_nombre, banco_numero_cuenta, banco_tipo_cuenta, notas, activo
    )
    VALUES (
      ${datos.nombre}, ${datos.rol}, ${datos.telefono}, ${datos.tipoDocumento}, ${datos.documento},
      ${datos.correo}, ${datos.direccion}, ${datos.fotoUrl}, ${datos.bancoNombre},
      ${datos.bancoNumeroCuenta}, ${datos.bancoTipoCuenta}, ${datos.notas}, ${datos.activo}
    )
    RETURNING id
  `;
  return filas[0].id;
}

export async function actualizarTrabajador(id, datos) {
  const sql = getSql();
  await sql`
    UPDATE trabajadores SET
      nombre = ${datos.nombre}, rol = ${datos.rol}, telefono = ${datos.telefono},
      tipo_documento = ${datos.tipoDocumento}, documento = ${datos.documento},
      correo = ${datos.correo}, direccion = ${datos.direccion}, foto_url = ${datos.fotoUrl},
      banco_nombre = ${datos.bancoNombre}, banco_numero_cuenta = ${datos.bancoNumeroCuenta},
      banco_tipo_cuenta = ${datos.bancoTipoCuenta}, notas = ${datos.notas}, activo = ${datos.activo}
    WHERE id = ${id}
  `;
}

export async function eliminarTrabajador(id) {
  const sql = getSql();
  await sql`DELETE FROM trabajadores WHERE id = ${id}`;
}
