import { getSql } from "./db.js";

export const CONFIG = {
  ordenPrefijo: "DINAR",
};

function filaAProductoPublico(fila) {
  return {
    referencia: fila.referencia,
    tipo: fila.tipo,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    volumen: Number(fila.volumen),
    peso: Number(fila.peso),
    precioBase: Number(fila.precio_base),
    material: fila.material,
    medidas: fila.medidas,
    tallas: fila.tallas,
    imagenes: fila.imagenes,
    modeloStl: fila.modelo_stl,
  };
}

export async function listarProductos() {
  const sql = getSql();
  const filas = await sql`SELECT * FROM productos ORDER BY tipo, referencia`;
  return filas.map(filaAProductoPublico);
}

export async function obtenerProducto(referencia) {
  const sql = getSql();
  const filas = await sql`SELECT * FROM productos WHERE referencia = ${referencia}`;
  return filas[0] ? filaAProductoPublico(filas[0]) : null;
}

export async function precioProducto(referencia) {
  const sql = getSql();
  const filas = await sql`SELECT precio_base FROM productos WHERE referencia = ${referencia}`;
  return filas[0] ? Number(filas[0].precio_base) : null;
}

export async function crearProducto(datos) {
  const sql = getSql();
  await sql`
    INSERT INTO productos (referencia, tipo, nombre, descripcion, volumen, peso, precio_base, material, medidas, tallas, imagenes, modelo_stl)
    VALUES (${datos.referencia}, ${datos.tipo}, ${datos.nombre}, ${datos.descripcion}, ${datos.volumen}, ${datos.peso}, ${datos.precioBase}, ${datos.material}, ${JSON.stringify(datos.medidas)}, ${JSON.stringify(datos.tallas)}, ${JSON.stringify(datos.imagenes)}, ${datos.modeloStl})
  `;
}

export async function actualizarProducto(referencia, datos) {
  const sql = getSql();
  await sql`
    UPDATE productos SET
      tipo = ${datos.tipo}, nombre = ${datos.nombre}, descripcion = ${datos.descripcion},
      volumen = ${datos.volumen}, peso = ${datos.peso}, precio_base = ${datos.precioBase},
      material = ${datos.material}, medidas = ${JSON.stringify(datos.medidas)},
      tallas = ${JSON.stringify(datos.tallas)}, imagenes = ${JSON.stringify(datos.imagenes)},
      modelo_stl = ${datos.modeloStl}, actualizado_en = now()
    WHERE referencia = ${referencia}
  `;
}

export async function eliminarProducto(referencia) {
  const sql = getSql();
  await sql`DELETE FROM productos WHERE referencia = ${referencia}`;
}
