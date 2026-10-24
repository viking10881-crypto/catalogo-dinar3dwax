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

// Flujo de una solicitud en el admin: llega "nueva", se le manda precio
// ("cotizada"), el cliente acepta ("aprobada"), el diseñador la modela
// ("en_diseno") y se le entregan los archivos ("entregada"). "descartada"
// puede pasar en cualquier punto.
export const ESTADOS_SOLICITUD = ["nueva", "cotizada", "aprobada", "en_diseno", "entregada", "descartada"];

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
    tipoSolicitud: fila.tipo_solicitud ?? "diseno",
    cantidad: fila.cantidad ?? 1,
    precioCotizado: fila.precio_cotizado == null ? null : Number(fila.precio_cotizado),
    tiempoEntrega: fila.tiempo_entrega ?? "",
    entregables: Array.isArray(fila.entregables) ? fila.entregables : [],
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
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
  const esImpresion = body.tipoSolicitud === "impresion";
  const datos = {
    tipoSolicitud: esImpresion ? "impresion" : "diseno",
    cantidad: 1,
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

  if (esImpresion) {
    // Impresión de un STL que ya trae el cliente: el archivo es lo único
    // imprescindible; tipo de joya y presupuesto no aplican.
    datos.tipoJoya = "";
    datos.presupuesto = "";
    const cantidad = Number(body.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) errores.push("La cantidad debe ser entre 1 y 999");
    else datos.cantidad = cantidad;
    if (!datos.archivoUrl) errores.push("Adjunta el archivo STL que quieres imprimir");
  } else {
    if (!TIPOS_JOYA.includes(datos.tipoJoya)) errores.push("Elige un tipo de joya");
    if (!PRESUPUESTOS.includes(datos.presupuesto)) errores.push("Elige un presupuesto estimado");
    if (!datos.descripcion) errores.push("Cuéntanos tu idea en la descripción");
  }

  if (datos.archivoUrl && !(esUrlDeNuestroBlob(datos.archivoUrl) && datos.archivoUrl.includes("/solicitudes-diseno/"))) {
    errores.push("El archivo adjunto no es válido");
  }
  if (!datos.archivoUrl) datos.archivoNombre = "";

  return { datos, errores };
}

export async function crearSolicitudDiseno(datos) {
  const sql = getSql();
  const filas = await sql`
    INSERT INTO solicitudes_diseno (tipo_solicitud, cantidad, nombre, whatsapp, tipo_joya, presupuesto, descripcion, archivo_url, archivo_nombre)
    VALUES (${datos.tipoSolicitud}, ${datos.cantidad}, ${datos.nombre}, ${datos.whatsapp}, ${datos.tipoJoya}, ${datos.presupuesto}, ${datos.descripcion}, ${datos.archivoUrl}, ${datos.archivoNombre})
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

/**
 * Valida un cambio hecho desde el admin sobre una solicitud existente: solo
 * se tocan los campos que vienen en el body, el resto se conserva.
 */
export function validarCambioSolicitud(body, existente) {
  const errores = [];
  const datos = {
    estado: body.estado ?? existente.estado,
    notas: body.notas === undefined ? existente.notas : texto(body.notas, 4000),
    tiempoEntrega: body.tiempoEntrega === undefined ? existente.tiempoEntrega : texto(body.tiempoEntrega, 80),
    precioCotizado: existente.precioCotizado,
    entregables: existente.entregables,
  };

  if (!ESTADOS_SOLICITUD.includes(datos.estado)) errores.push("Estado inválido");

  if (body.precioCotizado !== undefined) {
    if (body.precioCotizado === null || body.precioCotizado === "") {
      datos.precioCotizado = null;
    } else {
      const precio = Number(body.precioCotizado);
      if (!Number.isFinite(precio) || precio < 0) errores.push("El precio cotizado no es válido");
      else datos.precioCotizado = Math.round(precio);
    }
  }

  if (body.entregables !== undefined) {
    if (!Array.isArray(body.entregables) || body.entregables.length > 30) {
      errores.push("La lista de entregables no es válida");
    } else {
      datos.entregables = body.entregables.map((e) => ({ url: texto(e?.url, 1000), nombre: texto(e?.nombre, 200) }));
      if (datos.entregables.some((e) => !esUrlDeNuestroBlob(e.url) || !e.url.includes("/solicitudes-diseno/"))) {
        errores.push("Uno de los entregables no es un archivo válido");
      }
    }
  }

  return { datos, errores };
}

export async function actualizarSolicitudDiseno(id, datos) {
  const sql = getSql();
  await sql`
    UPDATE solicitudes_diseno SET
      estado = ${datos.estado}, notas = ${datos.notas},
      precio_cotizado = ${datos.precioCotizado}, tiempo_entrega = ${datos.tiempoEntrega},
      entregables = ${JSON.stringify(datos.entregables)}::jsonb, actualizado_en = now()
    WHERE id = ${id}
  `;
}

export async function eliminarSolicitudDiseno(id) {
  const sql = getSql();
  await sql`DELETE FROM solicitudes_diseno WHERE id = ${id}`;
}
