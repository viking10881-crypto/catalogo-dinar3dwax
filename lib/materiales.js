import { getSql } from "./db.js";

function filaAMaterial(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    cantidad: Number(fila.cantidad),
    unidad: fila.unidad,
    costoTotal: Number(fila.costo_total),
    proveedor: fila.proveedor,
    fecha: fila.fecha,
    notas: fila.notas,
    creadoEn: fila.creado_en,
  };
}

export async function listarMateriales() {
  const sql = getSql();
  const filas = await sql`SELECT * FROM materiales ORDER BY fecha DESC, id DESC`;
  return filas.map(filaAMaterial);
}

export async function obtenerMaterial(id) {
  const sql = getSql();
  const filas = await sql`SELECT * FROM materiales WHERE id = ${id}`;
  return filas[0] ? filaAMaterial(filas[0]) : null;
}

export async function crearMaterial(datos) {
  const sql = getSql();
  const filas = await sql`
    INSERT INTO materiales (nombre, cantidad, unidad, costo_total, proveedor, fecha, notas)
    VALUES (${datos.nombre}, ${datos.cantidad}, ${datos.unidad}, ${datos.costoTotal}, ${datos.proveedor}, ${datos.fecha}, ${datos.notas})
    RETURNING id
  `;
  return filas[0].id;
}

export async function actualizarMaterial(id, datos) {
  const sql = getSql();
  await sql`
    UPDATE materiales SET
      nombre = ${datos.nombre}, cantidad = ${datos.cantidad}, unidad = ${datos.unidad},
      costo_total = ${datos.costoTotal}, proveedor = ${datos.proveedor},
      fecha = ${datos.fecha}, notas = ${datos.notas}
    WHERE id = ${id}
  `;
}

export async function eliminarMaterial(id) {
  const sql = getSql();
  await sql`DELETE FROM materiales WHERE id = ${id}`;
}
