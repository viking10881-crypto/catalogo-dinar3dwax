import { getSql } from "./db.js";
import { esUrlDeNuestroBlob } from "./blob.js";

export const TIPOS_JOYA = [
  "Anillo de compromiso",
  "Argolla de matrimonio",
  "Anillo",
  "Dije",
  "Aretes",
  "Pulsera",
  "Cadena",
  "Otro",
];

export const PRESUPUESTOS = [
  "Menos de $80.000",
  "$80.000 - $150.000",
  "$150.000 - $300.000",
  "Más de $300.000",
  "Aún no lo sé",
];

export const ESTADOS_SOLICITUD = ["nueva", "en_proceso", "respondida", "descartada"];

function filaASolicitud(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    whatsapp: fila.whatsapp,
    tipoJoya: fila.tipo_joya,
    presupuesto: fila.presupuesto,
    descripcion: fila.descripcion,
    archivoUrl: fila.archivo_url,
    archivoNombre: fila.archivo_nombre,
    estado: fila.estado,
    notas: fila.notas,
    creadoEn: fila.creado_en,
  };
}

function texto(valor, max) {
  return String(valor ?? "").trim().slice(0, max);
}

/**
 * Valida lo que llega del formulario público (sin login): nada de aquí es
 * confiable. El archivo solo se acepta si es una URL de nuestro propio
 * Blob dentro de la carpeta solicitudes-diseno/ (la que autoriza el token
 * de subida de api/solicitudes-diseno.js).
 */
export function validarSolicitudPublica(body) {
  const errores = [];
  const datos = {
    nombre: texto(body.nombre, 120),
    whatsapp: texto(body.whatsapp, 40),
    tipoJoya: texto(body.tipoJoya, 60),
    presupuesto: texto(body.presupuesto, 60),
    descripcion: texto(body.descripcion, 4000),
    archivoUrl: texto(body.archivoUrl, 1000),
    archivoNombre: texto(body.archivoNombre, 200),
  };

  if (!datos.nombre) errores.push("Escribe tu nombre");
  if (datos.whatsapp.replace(/\D/g, "").length < 7) errores.push("Escribe un número de WhatsApp válido");
  if (!TIPOS_JOYA.includes(datos.tipoJoya)) errores.push("Elige un tipo de joya");
  if (!PRESUPUESTOS.includes(datos.presupuesto)) errores.push("Elige un presupuesto estimado");
  if (!datos.descripcion) errores.push("Cuéntanos tu idea en la descripción");
  if (datos.archivoUrl && !(esUrlDeNuestroBlob(datos.archivoUrl) && datos.archivoUrl.includes("/solicitudes-diseno/"))) {
    errores.push("El archivo adjunto no es válido");
  }
  if (!datos.archivoUrl) datos.archivoNombre = "";

  return { datos, errores };
}

export async function crearSolicitudDiseno(datos) {
  const sql = getSql();
  const filas = await sql`
    INSERT INTO solicitudes_diseno (nombre, whatsapp, tipo_joya, presupuesto, descripcion, archivo_url, archivo_nombre)
    VALUES (${datos.nombre}, ${datos.whatsapp}, ${datos.tipoJoya}, ${datos.presupuesto}, ${datos.descripcion}, ${datos.archivoUrl}, ${datos.archivoNombre})
    RETURNING *
  `;
  return filaASolicitud(filas[0]);
}

export async function listarSolicitudesDiseno() {
  const sql = getSql();
  const filas = await sql`SELECT * FROM solicitudes_diseno ORDER BY creado_en DESC, id DESC`;
  return filas.map(filaASolicitud);
}

export async function obtenerSolicitudDiseno(id) {
  const sql = getSql();
  const filas = await sql`SELECT * FROM solicitudes_diseno WHERE id = ${id}`;
  return filas[0] ? filaASolicitud(filas[0]) : null;
}

export async function actualizarSolicitudDiseno(id, { estado, notas }) {
  const sql = getSql();
  await sql`UPDATE solicitudes_diseno SET estado = ${estado}, notas = ${notas} WHERE id = ${id}`;
}

export async function eliminarSolicitudDiseno(id) {
  const sql = getSql();
  await sql`DELETE FROM solicitudes_diseno WHERE id = ${id}`;
}
