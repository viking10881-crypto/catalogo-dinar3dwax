import nodemailer from "nodemailer";

const REMITENTE = "dinar3dwax@gmail.com";

/**
 * Envía el comprobante por correo desde la cuenta de Gmail de la joyería,
 * vía SMTP (no una pasarela de correo transaccional de terceros, a
 * propósito: así sale literalmente "de parte de" dinar3dwax@gmail.com).
 * Requiere GMAIL_APP_PASSWORD — una contraseña de aplicación de esa cuenta
 * (Gmail → Seguridad → Verificación en 2 pasos → Contraseñas de
 * aplicaciones), NUNCA la contraseña normal de la cuenta.
 */
function transportador() {
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("El envío de correo no está configurado (falta GMAIL_APP_PASSWORD)");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: REMITENTE, pass: process.env.GMAIL_APP_PASSWORD },
  });
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
      </p>
    </div>
  `;

  const transporte = transportador();
  await transporte.sendMail({
    from: `Dinar 3D Wax <${REMITENTE}>`,
    to: pago.trabajadorCorreo,
    subject: `Comprobante de pago · ${pago.concepto}`,
    html,
  });
}
