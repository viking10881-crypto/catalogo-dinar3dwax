import crypto from "node:crypto";
import { del } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import {
  requiereAdmin,
  sesionValida,
  crearTokenSesion,
  establecerCookieSesion,
  borrarCookieSesion,
} from "../../lib/adminAuth.js";
import { esUrlDeNuestroBlob } from "../../lib/blob.js";
import { obtenerConfiguracion, actualizarConfiguracion } from "../../lib/configuracion.js";
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../../lib/productos.js";
import { validarProducto } from "../../lib/validarProducto.js";
import {
  listarPedidos,
  obtenerPedidoAdmin,
  actualizarEstadoPedido,
  guardarEstadoProduccion,
} from "../../lib/pedidos.js";
import { enviarAProduccion } from "../../lib/produccion.js";

/**
 * Router único para /api/admin/:seccion. Vercel Hobby limita a 12
 * Serverless Functions por deploy; el catálogo ya tenía 16 endpoints
 * reales, así que los 11 de /admin (que antes eran archivos separados) se
 * consolidaron aquí. El id/referencia de un recurso puntual va por query
 * string (?id=, ?referencia=) en vez de un segmento extra de ruta: el
 * catch-all `[...route].js` de Vercel resultó no soportar de forma
 * confiable rutas de más de un segmento en este tipo de proyecto ("Other"
 * framework, sin Next.js) — se comprobó en producción, no solo en
 * `vercel dev`.
 */

function contraseñaValida(recibida) {
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada) throw new Error("ADMIN_PASSWORD no está configurada");
  const a = Buffer.from(String(recibida || ""));
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function manejarLogin(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const { password } = req.body || {};
    if (!contraseñaValida(password)) {
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }
    establecerCookieSesion(req, res, crearTokenSesion());
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error en login de admin:", err);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
}

async function manejarLogout(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  borrarCookieSesion(req, res);
  res.status(200).json({ ok: true });
}

async function manejarSession(req, res) {
  res.status(200).json({ autenticado: sesionValida(req) });
}

function validarConfiguracionBody(body) {
  const errores = [];
  const datos = {};

  datos.whatsappNumero = String(body.whatsappNumero || "").replace(/[^0-9]/g, "");
  if (datos.whatsappNumero.length < 10) errores.push("El número de WhatsApp no es válido");

  datos.divisorPesoOro18k = Number(body.divisorPesoOro18k);
  if (!Number.isFinite(datos.divisorPesoOro18k) || datos.divisorPesoOro18k <= 0) {
    errores.push("El divisor debe ser un número mayor a 0");
  }

  datos.precioPorGramoCera = Number(body.precioPorGramoCera);
  if (!Number.isFinite(datos.precioPorGramoCera) || datos.precioPorGramoCera <= 0) {
    errores.push("El precio por gramo debe ser un número mayor a 0");
  }

  datos.bancoNombre = String(body.bancoNombre || "").trim();
  if (!datos.bancoNombre) errores.push("El nombre del banco es obligatorio");

  datos.bancoTipoCuenta = String(body.bancoTipoCuenta || "").trim();
  if (!datos.bancoTipoCuenta) errores.push("El tipo de cuenta es obligatorio");

  datos.bancoNumeroCuenta = String(body.bancoNumeroCuenta || "").trim();
  if (!datos.bancoNumeroCuenta) errores.push("El número de cuenta es obligatorio");

  datos.bancoTitular = String(body.bancoTitular || "").trim();
  if (!datos.bancoTitular) errores.push("El titular de la cuenta es obligatorio");

  datos.bancoDocumento = String(body.bancoDocumento || "").trim();
  if (!datos.bancoDocumento) errores.push("El documento del titular es obligatorio");

  datos.bannerImagenes = Array.isArray(body.bannerImagenes)
    ? body.bannerImagenes.map((u) => String(u || "").trim()).filter(Boolean)
    : [];

  return { datos, errores };
}

async function manejarConfiguracion(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const configuracion = await obtenerConfiguracion();
      res.status(200).json(configuracion);
    } catch (err) {
      console.error("Error obteniendo configuración:", err);
      res.status(500).json({ error: "No se pudo cargar la configuración" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const { datos, errores } = validarConfiguracionBody(req.body || {});
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }
      await actualizarConfiguracion(datos);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando configuración:", err);
      res.status(500).json({ error: "No se pudo guardar la configuración" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}

async function manejarBorrarImagen(req, res) {
  if (!requiereAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const { url } = req.body || {};
    if (!esUrlDeNuestroBlob(url)) {
      res.status(400).json({ error: "URL inválida" });
      return;
    }
    await del(url);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error borrando imagen:", err);
    res.status(500).json({ error: "No se pudo borrar la imagen" });
  }
}

/**
 * Genera un token de subida para que el navegador suba el archivo
 * directo a Vercel Blob, sin pasar por esta función. Es el reemplazo del
 * viejo flujo JSON+base64 (que llevaba el archivo dentro del body de la
 * petición): Vercel limita el body de una función a 4.5 MB, así que
 * cualquier imagen/STL codificado en base64 arriba de ~3.2 MB fallaba con
 * 413, aunque el mensaje dijera "máx. 8/20 MB". Subiendo directo a Blob
 * ese límite no aplica.
 */
async function manejarUploadToken(req, res) {
  if (!requiereAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayloadJson) => {
        let contexto = "";
        try {
          contexto = clientPayloadJson ? JSON.parse(clientPayloadJson).contexto : "";
        } catch {
          contexto = "";
        }

        if (contexto === "stl") {
          if (!/\.stl$/i.test(pathname)) throw new Error("El archivo debe tener extensión .stl");
          return { maximumSizeInBytes: 200 * 1024 * 1024 };
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 20 * 1024 * 1024,
        };
      },
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error("Error generando token de subida:", err);
    res.status(400).json({ error: err.message || "No se pudo generar el token de subida" });
  }
}

async function manejarProductos(req, res) {
  if (!requiereAdmin(req, res)) return;

  const referenciaQuery = req.query.referencia;

  if (!referenciaQuery) {
    if (req.method === "GET") {
      try {
        const productos = await listarProductos();
        res.status(200).json(productos);
      } catch (err) {
        console.error("Error listando productos (admin):", err);
        res.status(500).json({ error: "No se pudo cargar el catálogo" });
      }
      return;
    }

    if (req.method === "POST") {
      try {
        const { datos, errores } = validarProducto(req.body || {});
        if (errores.length > 0) {
          res.status(400).json({ error: errores.join(". ") });
          return;
        }

        const existente = await obtenerProducto(datos.referencia);
        if (existente) {
          res.status(409).json({ error: `Ya existe un producto con la referencia ${datos.referencia}` });
          return;
        }

        await crearProducto(datos);
        res.status(201).json({ ok: true, referencia: datos.referencia });
      } catch (err) {
        console.error("Error creando producto:", err);
        res.status(500).json({ error: "No se pudo crear el producto" });
      }
      return;
    }

    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const referencia = String(referenciaQuery || "").toUpperCase();

  if (req.method === "GET") {
    try {
      const producto = await obtenerProducto(referencia);
      if (!producto) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }
      res.status(200).json(producto);
    } catch (err) {
      console.error("Error obteniendo producto:", err);
      res.status(500).json({ error: "No se pudo cargar el producto" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const existente = await obtenerProducto(referencia);
      if (!existente) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }

      const { datos, errores } = validarProducto(req.body || {}, { exigirReferencia: false });
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }

      await actualizarProducto(referencia, datos);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando producto:", err);
      res.status(500).json({ error: "No se pudo actualizar el producto" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const producto = await obtenerProducto(referencia);
      await eliminarProducto(referencia);

      // Limpieza del storage: nunca debe bloquear la respuesta si falla.
      if (producto) {
        const archivos = [...(producto.imagenes || []), producto.modeloStl].filter(esUrlDeNuestroBlob);
        await Promise.all(
          archivos.map((url) => del(url).catch((err) => console.error("No se pudo borrar archivo:", url, err)))
        );
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error eliminando producto:", err);
      res.status(500).json({ error: "No se pudo eliminar el producto" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}

async function manejarPedidos(req, res) {
  if (!requiereAdmin(req, res)) return;

  const idQuery = req.query.id;

  if (!idQuery) {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Método no permitido" });
      return;
    }
    try {
      const pedidos = await listarPedidos();
      res.status(200).json(pedidos);
    } catch (err) {
      console.error("Error listando pedidos:", err);
      res.status(500).json({ error: "No se pudo cargar el listado de pedidos" });
    }
    return;
  }

  const id = String(idQuery || "");

  if (req.method !== "PUT") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const ESTADOS_VALIDOS = ["pendiente", "aprobado", "rechazado"];

  try {
    const estado = String((req.body || {}).estado || "");
    if (!ESTADOS_VALIDOS.includes(estado)) {
      res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
      return;
    }

    const pedido = await obtenerPedidoAdmin(id);
    if (!pedido) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    await actualizarEstadoPedido(id, estado);

    let produccion = null;
    if (estado === "aprobado") {
      produccion = await enviarAProduccion(pedido);
      await guardarEstadoProduccion(id, produccion);
    }

    res.status(200).json({ ok: true, produccion });
  } catch (err) {
    console.error("Error actualizando pedido:", err);
    res.status(500).json({ error: "No se pudo actualizar el pedido" });
  }
}

export default async function handler(req, res) {
  const seccion = req.query.seccion;

  switch (seccion) {
    case "login":
      return manejarLogin(req, res);
    case "logout":
      return manejarLogout(req, res);
    case "session":
      return manejarSession(req, res);
    case "configuracion":
      return manejarConfiguracion(req, res);
    case "borrar-imagen":
      return manejarBorrarImagen(req, res);
    case "upload-token":
      return manejarUploadToken(req, res);
    case "productos":
      return manejarProductos(req, res);
    case "pedidos":
      return manejarPedidos(req, res);
    default:
      res.status(404).json({ error: "No encontrado" });
  }
}
