import { requiereAdmin } from "../lib/adminAuth.js";
import { obtenerConfiguracion, actualizarConfiguracion } from "../lib/configuracion.js";

function validarConfiguracion(body) {
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

  return { datos, errores };
}

export default async function handler(req, res) {
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
      const { datos, errores } = validarConfiguracion(req.body || {});
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
