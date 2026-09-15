/**
 * Menú lateral compartido por las páginas del panel (excepto login.html).
 * Para agregar una sección nueva del panel más adelante, solo hay que sumar
 * una entrada aquí y crear su página — el resto del layout no cambia.
 */
const SECCIONES_ADMIN = [
  { id: "inicio", etiqueta: "🏠 Inicio", href: "/admin/index.html" },
  { id: "productos", etiqueta: "💍 Productos", href: "/admin/productos.html" },
  { id: "pedidos", etiqueta: "🧾 Pedidos", href: "/admin/pedidos.html" },
  { id: "configuracion", etiqueta: "⚙️ Configuración", href: "/admin/configuracion.html" },
];

function renderAdminSidebar(seccionActiva) {
  const nav = document.getElementById("admin-sidebar-nav");
  if (!nav) return;
  nav.innerHTML = SECCIONES_ADMIN.map(
    (s) => `<a href="${s.href}" class="${s.id === seccionActiva ? "activo" : ""}">${s.etiqueta}</a>`
  ).join("");
}
