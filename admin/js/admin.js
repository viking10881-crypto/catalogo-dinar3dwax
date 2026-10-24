/**
 * Utilidades compartidas del panel de administración.
 */
const TIPOS_PRODUCTO = [
  { valor: "anillos", etiqueta: "Anillos" },
  { valor: "dijes", etiqueta: "Dijes" },
  { valor: "aretes", etiqueta: "Aretes" },
  { valor: "cadenas", etiqueta: "Cadenas" },
  { valor: "pulseras", etiqueta: "Pulseras" },
];

// Estados de una solicitud (Servicios 3D / Impresión STL de index.html), en el orden
// del flujo. "descartada" va aparte: no es un paso, se sale del flujo.
const ESTADOS_SOLICITUD = [
  { valor: "nueva", etiqueta: "Nueva" },
  { valor: "cotizada", etiqueta: "Cotizada" },
  { valor: "aprobada", etiqueta: "Aprobada" },
  { valor: "en_diseno", etiqueta: "En diseño" },
  { valor: "entregada", etiqueta: "Entregada" },
  { valor: "descartada", etiqueta: "Descartada" },
];

/**
 * Número para links wa.me (solo dígitos, con indicativo). Los clientes
 * suelen escribir el celular colombiano sin el 57 (ej. "3001234567"), y sin
 * indicativo wa.me abre otro número: en ese caso se le antepone el 57.
 */
function numeroWhatsapp(texto) {
  const digitos = String(texto || "").replace(/\D/g, "");
  return /^3\d{9}$/.test(digitos) ? "57" + digitos : digitos;
}

function etiquetaEstadoSolicitud(valor) {
  return (ESTADOS_SOLICITUD.find((e) => e.valor === valor) || { etiqueta: valor }).etiqueta;
}

function formatearPrecioAdmin(numero) {
  return "$" + Math.round(numero).toLocaleString("es-CO");
}

/**
 * Escapa HTML antes de insertar en innerHTML. Usar en todo dato que no sea
 * 100% controlado por el propio admin — sobre todo lo que viene de un
 * pedido (nombre/dirección/correo del cliente final, items del carrito):
 * ese formulario es público y sin login, así que nada de ahí es confiable
 * como texto plano hasta que se escapa.
 */
function escaparHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function cerrarSesion() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const btnSalir = document.getElementById("btn-cerrar-sesion");
  if (btnSalir) btnSalir.addEventListener("click", cerrarSesion);
});
