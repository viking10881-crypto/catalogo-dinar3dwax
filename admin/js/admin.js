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

async function verificarSesion() {
  const r = await fetch("/api/admin/session");
  if (!r.ok) return false;
  const datos = await r.json();
  return !!datos.autenticado;
}

async function exigirSesion() {
  const ok = await verificarSesion();
  if (!ok) window.location.href = "/admin/login.html";
  return ok;
}

async function cerrarSesion() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const btnSalir = document.getElementById("btn-cerrar-sesion");
  if (btnSalir) btnSalir.addEventListener("click", cerrarSesion);
});
