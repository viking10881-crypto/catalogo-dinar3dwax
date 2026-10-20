import crypto from "node:crypto";
import { del } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import {
  requiereAdmin,
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
import { urlAccesoTaller } from "../../lib/accesoTaller.js";
import { enviarComprobantePago } from "../../lib/correo.js";
import {
  listarTrabajadores,
  obtenerTrabajador,
  crearTrabajador,
  actualizarTrabajador,
  eliminarTrabajador,
} from "../../lib/trabajadores.js";
import {
  listarMateriales,
  obtenerMaterial,
  crearMaterial,
  actualizarMaterial,
  eliminarMaterial,
} from "../../lib/materiales.js";
import {
  listarPagos,
  listarPagosDeTrabajador,
  obtenerPago,
  crearPago,
  eliminarPago,
} from "../../lib/pagos.js";
import {
  listarSolicitudesDiseno,
  obtenerSolicitudDiseno,
  actualizarSolicitudDiseno,
  eliminarSolicitudDiseno,
  validarCambioSolicitud,
} from "../../lib/solicitudesDiseno.js";

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

        // Archivos terminados de una solicitud de diseño (página
        // admin/solicitud.html): STL/3DM no tienen un content-type fijo
        // entre navegadores, así que se valida por extensión.
        if (contexto === "entregable") {
          if (!/^solicitudes-diseno\/entregables\//.test(pathname)) throw new Error("Ruta de destino inválida");
          if (!/\.(stl|3dm|obj|jpe?g|png|webp|pdf|mp4|mov|zip)$/i.test(pathname)) {
            throw new Error("Formato no permitido (usa STL, 3DM, OBJ, JPG, PNG, WEBP, PDF, MP4, MOV o ZIP)");
          }
          return { maximumSizeInBytes: 200 * 1024 * 1024, addRandomSuffix: true };
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

function validarTrabajadorBody(body) {
  const errores = [];
  const datos = {};

  datos.nombre = String(body.nombre || "").trim();
  if (!datos.nombre) errores.push("El nombre es obligatorio");

  datos.rol = String(body.rol || "Diseñador").trim();
  datos.telefono = String(body.telefono || "").trim();
  datos.tipoDocumento = String(body.tipoDocumento || "CC").trim();
  datos.documento = String(body.documento || "").trim();
  datos.correo = String(body.correo || "").trim();
  datos.direccion = String(body.direccion || "").trim();
  datos.fotoUrl = String(body.fotoUrl || "").trim();
  datos.bancoNombre = String(body.bancoNombre || "").trim();
  datos.bancoNumeroCuenta = String(body.bancoNumeroCuenta || "").trim();
  datos.bancoTipoCuenta = String(body.bancoTipoCuenta || "Ahorros").trim();
  datos.notas = String(body.notas || "").trim();
  datos.activo = body.activo !== false;

  return { datos, errores };
}

async function manejarTrabajadores(req, res) {
  if (!requiereAdmin(req, res)) return;

  const idQuery = req.query.id;

  if (!idQuery) {
    if (req.method === "GET") {
      try {
        res.status(200).json(await listarTrabajadores());
      } catch (err) {
        console.error("Error listando trabajadores:", err);
        res.status(500).json({ error: "No se pudo cargar el listado de trabajadores" });
      }
      return;
    }

    if (req.method === "POST") {
      try {
        const { datos, errores } = validarTrabajadorBody(req.body || {});
        if (errores.length > 0) {
          res.status(400).json({ error: errores.join(". ") });
          return;
        }
        const id = await crearTrabajador(datos);
        res.status(201).json({ ok: true, id });
      } catch (err) {
        console.error("Error creando trabajador:", err);
        res.status(500).json({ error: "No se pudo crear el trabajador" });
      }
      return;
    }

    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const id = Number(idQuery);

  if (req.method === "GET") {
    try {
      const trabajador = await obtenerTrabajador(id);
      if (!trabajador) {
        res.status(404).json({ error: "Trabajador no encontrado" });
        return;
      }
      res.status(200).json(trabajador);
    } catch (err) {
      console.error("Error obteniendo trabajador:", err);
      res.status(500).json({ error: "No se pudo cargar el colaborador" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const existente = await obtenerTrabajador(id);
      if (!existente) {
        res.status(404).json({ error: "Trabajador no encontrado" });
        return;
      }
      const { datos, errores } = validarTrabajadorBody(req.body || {});
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }
      await actualizarTrabajador(id, datos);

      // Se reemplazó la foto: la anterior queda huérfana en Blob si no se borra.
      if (existente.fotoUrl && existente.fotoUrl !== datos.fotoUrl && esUrlDeNuestroBlob(existente.fotoUrl)) {
        del(existente.fotoUrl).catch((err) => console.error("No se pudo borrar foto anterior:", existente.fotoUrl, err));
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando trabajador:", err);
      res.status(500).json({ error: "No se pudo actualizar el trabajador" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const trabajador = await obtenerTrabajador(id);
      await eliminarTrabajador(id);

      // Igual que con las imágenes de producto: nunca debe bloquear la
      // respuesta si falla el borrado del archivo en Blob.
      if (trabajador?.fotoUrl && esUrlDeNuestroBlob(trabajador.fotoUrl)) {
        del(trabajador.fotoUrl).catch((err) => console.error("No se pudo borrar foto:", trabajador.fotoUrl, err));
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error eliminando trabajador:", err);
      // El borrado de un trabajador con pagos ya registrados también borra
      // esos pagos (ON DELETE CASCADE): se avisa en el propio admin, no aquí.
      res.status(500).json({ error: "No se pudo eliminar el trabajador" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}

function validarMaterialBody(body) {
  const errores = [];
  const datos = {};

  datos.nombre = String(body.nombre || "").trim();
  if (!datos.nombre) errores.push("El nombre del material es obligatorio");

  datos.cantidad = Number(body.cantidad);
  if (!Number.isFinite(datos.cantidad) || datos.cantidad <= 0) {
    errores.push("La cantidad debe ser un número mayor a 0");
  }

  datos.unidad = String(body.unidad || "g").trim();

  datos.costoTotal = Number(body.costoTotal);
  if (!Number.isFinite(datos.costoTotal) || datos.costoTotal < 0) {
    errores.push("El costo total debe ser un número mayor o igual a 0");
  }

  datos.proveedor = String(body.proveedor || "").trim();
  datos.fecha = String(body.fecha || "").trim() || new Date().toISOString().slice(0, 10);
  datos.notas = String(body.notas || "").trim();

  return { datos, errores };
}

async function manejarMateriales(req, res) {
  if (!requiereAdmin(req, res)) return;

  const idQuery = req.query.id;

  if (!idQuery) {
    if (req.method === "GET") {
      try {
        res.status(200).json(await listarMateriales());
      } catch (err) {
        console.error("Error listando materiales:", err);
        res.status(500).json({ error: "No se pudo cargar el registro de materiales" });
      }
      return;
    }

    if (req.method === "POST") {
      try {
        const { datos, errores } = validarMaterialBody(req.body || {});
        if (errores.length > 0) {
          res.status(400).json({ error: errores.join(". ") });
          return;
        }
        const id = await crearMaterial(datos);
        res.status(201).json({ ok: true, id });
      } catch (err) {
        console.error("Error creando registro de material:", err);
        res.status(500).json({ error: "No se pudo registrar el material" });
      }
      return;
    }

    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const id = Number(idQuery);

  if (req.method === "PUT") {
    try {
      const existente = await obtenerMaterial(id);
      if (!existente) {
        res.status(404).json({ error: "Registro no encontrado" });
        return;
      }
      const { datos, errores } = validarMaterialBody(req.body || {});
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }
      await actualizarMaterial(id, datos);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando registro de material:", err);
      res.status(500).json({ error: "No se pudo actualizar el registro" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await eliminarMaterial(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error eliminando registro de material:", err);
      res.status(500).json({ error: "No se pudo eliminar el registro" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}

function validarPagoBody(body) {
  const errores = [];
  const datos = {};

  datos.trabajadorId = Number(body.trabajadorId);
  if (!Number.isFinite(datos.trabajadorId) || datos.trabajadorId <= 0) {
    errores.push("Debes seleccionar un trabajador");
  }

  datos.concepto = String(body.concepto || "").trim();
  if (!datos.concepto) errores.push("El concepto del pago es obligatorio");

  datos.monto = Number(body.monto);
  if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
    errores.push("El monto debe ser un número mayor a 0");
  }

  datos.fecha = String(body.fecha || "").trim() || new Date().toISOString().slice(0, 10);
  datos.metodoPago = String(body.metodoPago || "Transferencia").trim();
  datos.notas = String(body.notas || "").trim();

  return { datos, errores };
}

async function manejarPagos(req, res) {
  if (!requiereAdmin(req, res)) return;

  const idQuery = req.query.id;

  if (!idQuery) {
    if (req.method === "GET") {
      try {
        // ?trabajadorId= filtra al historial de un solo colaborador (su
        // perfil); sin el param, es el listado completo de /admin/pagos.
        const trabajadorIdQuery = req.query.trabajadorId;
        const pagos = trabajadorIdQuery
          ? await listarPagosDeTrabajador(Number(trabajadorIdQuery))
          : await listarPagos();
        res.status(200).json(pagos);
      } catch (err) {
        console.error("Error listando pagos:", err);
        res.status(500).json({ error: "No se pudo cargar el listado de pagos" });
      }
      return;
    }

    if (req.method === "POST") {
      try {
        const { datos, errores } = validarPagoBody(req.body || {});
        if (errores.length > 0) {
          res.status(400).json({ error: errores.join(". ") });
          return;
        }
        const existente = await obtenerTrabajador(datos.trabajadorId);
        if (!existente) {
          res.status(400).json({ error: "El trabajador seleccionado no existe" });
          return;
        }
        const id = await crearPago(datos);
        res.status(201).json({ ok: true, id });
      } catch (err) {
        console.error("Error creando pago:", err);
        res.status(500).json({ error: "No se pudo registrar el pago" });
      }
      return;
    }

    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const id = Number(idQuery);

  if (req.method === "GET") {
    try {
      const pago = await obtenerPago(id);
      if (!pago) {
        res.status(404).json({ error: "Pago no encontrado" });
        return;
      }
      res.status(200).json(pago);
    } catch (err) {
      console.error("Error obteniendo pago:", err);
      res.status(500).json({ error: "No se pudo cargar el pago" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const existente = await obtenerPago(id);
      if (!existente) {
        res.status(404).json({ error: "Pago no encontrado" });
        return;
      }
      await eliminarPago(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error eliminando pago:", err);
      res.status(500).json({ error: "No se pudo eliminar el pago" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}

async function manejarAccesoTaller(req, res) {
  if (!requiereAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    res.status(200).json({ url: urlAccesoTaller() });
  } catch (err) {
    console.error("Error generando acceso al taller:", err);
    res.status(500).json({ error: "No se pudo generar el acceso al taller" });
  }
}

/**
 * Trae las estadísticas del taller (dinar-3dwax) para mostrarlas en el
 * dashboard del admin junto a las del catálogo. Mismo secreto compartido
 * que ya usa lib/produccion.js para enviar pedidos→OT, aquí en sentido
 * contrario (lectura).
 */
async function manejarEstadisticasTaller(req, res) {
  if (!requiereAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  if (!process.env.DINAR3DWAX_API_URL || !process.env.CATALOGO_INTEGRACION_SECRET) {
    res.status(500).json({ error: "La integración con el taller no está configurada" });
    return;
  }
  try {
    const respuesta = await fetch(`${process.env.DINAR3DWAX_API_URL}/api/estadisticas-externas`, {
      headers: { "x-integracion-secret": process.env.CATALOGO_INTEGRACION_SECRET },
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      res.status(502).json({ error: datos.error || "El taller respondió con un error" });
      return;
    }
    res.status(200).json(datos);
  } catch (err) {
    console.error("Error obteniendo estadísticas del taller:", err);
    res.status(502).json({ error: "No se pudo contactar al taller (dinar-3dwax)" });
  }
}

/**
 * Envío del comprobante por correo: es una acción puntual que el admin
 * dispara a mano desde el comprobante (no automática al crear el pago),
 * para que decida caso a caso si el colaborador lo necesita por correo.
 */
async function manejarEnviarComprobante(req, res) {
  if (!requiereAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const pagoId = Number((req.body || {}).pagoId);
    if (!pagoId) {
      res.status(400).json({ error: "Falta indicar el pago a enviar" });
      return;
    }
    const pago = await obtenerPago(pagoId);
    if (!pago) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }
    await enviarComprobantePago(pago);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error enviando comprobante por correo:", err);
    res.status(500).json({ error: err.message || "No se pudo enviar el comprobante" });
  }
}

async function manejarSolicitudes(req, res) {
  if (!requiereAdmin(req, res)) return;

  const idQuery = req.query.id;

  if (!idQuery) {
    if (req.method === "GET") {
      try {
        res.status(200).json(await listarSolicitudesDiseno());
      } catch (err) {
        console.error("Error listando solicitudes de diseño:", err);
        res.status(500).json({ error: "No se pudieron cargar las solicitudes" });
      }
      return;
    }
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const id = Number(idQuery);

  // Borra de Blob archivos que ya no usa ninguna solicitud. Si falla no se
  // revierte el cambio en la base: solo queda un archivo huérfano.
  async function borrarDeBlob(urls) {
    for (const url of urls) {
      if (!esUrlDeNuestroBlob(url)) continue;
      try {
        await del(url);
      } catch (err) {
        console.error("No se pudo borrar un archivo de solicitud de Blob:", url, err);
      }
    }
  }

  try {
    const existente = await obtenerSolicitudDiseno(id);
    if (!existente) {
      res.status(404).json({ error: "Solicitud no encontrada" });
      return;
    }

    if (req.method === "GET") {
      res.status(200).json(existente);
      return;
    }

    if (req.method === "PUT") {
      const { datos, errores } = validarCambioSolicitud(req.body || {}, existente);
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }
      await actualizarSolicitudDiseno(id, datos);
      const urlsNuevas = new Set(datos.entregables.map((e) => e.url));
      await borrarDeBlob(existente.entregables.map((e) => e.url).filter((url) => !urlsNuevas.has(url)));
      res.status(200).json(await obtenerSolicitudDiseno(id));
      return;
    }

    if (req.method === "DELETE") {
      await eliminarSolicitudDiseno(id);
      await borrarDeBlob([existente.archivoUrl, ...existente.entregables.map((e) => e.url)]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("Error gestionando solicitud de diseño:", err);
    res.status(500).json({ error: "No se pudo completar la acción" });
  }
}

export default async function handler(req, res) {
  const seccion = req.query.seccion;

  switch (seccion) {
    case "login":
      return manejarLogin(req, res);
    case "logout":
      return manejarLogout(req, res);
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
    case "trabajadores":
      return manejarTrabajadores(req, res);
    case "materiales":
      return manejarMateriales(req, res);
    case "pagos":
      return manejarPagos(req, res);
    case "acceso-taller":
      return manejarAccesoTaller(req, res);
    case "estadisticas-taller":
      return manejarEstadisticasTaller(req, res);
    case "enviar-comprobante":
      return manejarEnviarComprobante(req, res);
    case "solicitudes":
      return manejarSolicitudes(req, res);
    default:
      res.status(404).json({ error: "No encontrado" });
  }
}
