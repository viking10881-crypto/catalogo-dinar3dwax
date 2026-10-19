import { Resend } from "resend";

const CORREO_CONTACTO_JOYERIA = "dinar3dwax@gmail.com";

/**
 * Envía el comprobante por correo vía Resend (integración de Vercel
 * Marketplace, ver RESEND_API_KEY/RESEND_EMAIL_DOMAIN). No se pudo usar
 * Gmail/SMTP con contraseña de aplicación: Google la bloquea incluso con
 * verificación en 2 pasos activa (cada vez más común, no es algo
 * configurable desde acá). Por eso el remitente sale desde un subdominio
 * verificado (mail.joyasdinar.com) en vez de literal @gmail.com — pero
 * "Responder a" sigue apuntando al Gmail real de la joyería, así que
 * cualquier respuesta del colaborador sigue llegando ahí.
 */
function cliente() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("El envío de correo no está configurado (falta RESEND_API_KEY)");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function formatearPrecio(numero) {
  return "$" + Math.round(numero).toLocaleString("es-CO");
}

function formatearFecha(iso) {
  return new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("es-CO", { dateStyle: "long" });
}

export async function enviarComprobantePago(pago) {
  if (!pago.trabajadorCorreo) {
    throw new Error("Este colaborador no tiene correo registrado");
  }

  const dominio = process.env.RESEND_EMAIL_DOMAIN;
  if (!dominio) {
    throw new Error("El envío de correo no está configurado (falta RESEND_EMAIL_DOMAIN)");
  }

  const documento = [pago.trabajadorTipoDocumento, pago.trabajadorDocumento].filter(Boolean).join(" ") || "—";
  const banco = pago.trabajadorBancoNombre
    ? `${pago.trabajadorBancoNombre} · ${pago.trabajadorBancoTipoCuenta || ""} ${pago.trabajadorBancoNumeroCuenta || ""}`
    : "—";

  const html = `
    <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; color:#14120f;">
      <h2 style="border-bottom:2px solid #14120f; padding-bottom:12px;">Comprobante de pago — Dinar 3D Wax</h2>
      <p>Hola ${pago.trabajadorNombre},</p>
      <p>Te confirmamos el pago por tus servicios con los siguientes datos:</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="color:#6b675f; padding:4px 0;">Documento</td><td style="text-align:right; font-weight:600;">${documento}</td></tr>
        <tr><td style="color:#6b675f; padding:4px 0;">Banco</td><td style="text-align:right; font-weight:600;">${banco}</td></tr>
        <tr><td style="color:#6b675f; padding:4px 0;">Concepto</td><td style="text-align:right; font-weight:600;">${pago.concepto}</td></tr>
        <tr><td style="color:#6b675f; padding:4px 0;">Fecha del pago</td><td style="text-align:right; font-weight:600;">${formatearFecha(pago.fecha)}</td></tr>
        <tr><td style="color:#6b675f; padding:4px 0;">Método</td><td style="text-align:right; font-weight:600;">${pago.metodoPago}</td></tr>
      </table>
      <div style="background:#f1ece1; border-radius:8px; padding:14px 18px; margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <span>Total pagado</span>
        <span style="font-size:1.3rem; font-weight:800;">${formatearPrecio(pago.monto)}</span>
      </div>
      <p style="margin-top:28px; color:#6b675f; font-size:12px; text-align:center;">
        Comprobante generado por el panel de administración de Dinar 3D Wax.
        ¿Dudas? Responde este correo o escribe a ${CORREO_CONTACTO_JOYERIA}.
      </p>
    </div>
  `;

  const { error } = await cliente().emails.send({
    from: `Dinar 3D Wax <pagos@${dominio}>`,
    replyTo: CORREO_CONTACTO_JOYERIA,
    to: pago.trabajadorCorreo,
    subject: `Comprobante de pago · ${pago.concepto}`,
    html,
  });

  if (error) {
    console.error("Error enviando comprobante vía Resend:", error);
    throw new Error(error.message || "Resend no pudo enviar el comprobante");
  }
}
