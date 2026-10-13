import { getSql } from "./db.js";

function filaATrabajador(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    telefono: fila.telefono,
    documento: fila.documento,
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
    INSERT INTO trabajadores (nombre, rol, telefono, documento, notas, activo)
    VALUES (${datos.nombre}, ${datos.rol}, ${datos.telefono}, ${datos.documento}, ${datos.notas}, ${datos.activo})
    RETURNING id
  `;
  return filas[0].id;
}

export async function actualizarTrabajador(id, datos) {
  const sql = getSql();
  await sql`
    UPDATE trabajadores SET
      nombre = ${datos.nombre}, rol = ${datos.rol}, telefono = ${datos.telefono},
      documento = ${datos.documento}, notas = ${datos.notas}, activo = ${datos.activo}
    WHERE id = ${id}
  `;
}

export async function eliminarTrabajador(id) {
  const sql = getSql();
  await sql`DELETE FROM trabajadores WHERE id = ${id}`;
}
