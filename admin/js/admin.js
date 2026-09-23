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
