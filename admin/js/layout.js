/**
 * Menú lateral compartido por las páginas del panel (excepto login.html).
 * Para agregar una sección nueva del panel más adelante, solo hay que sumar
 * una entrada aquí y crear su página — el resto del layout no cambia.
 */
const SECCIONES_ADMIN = [
  { id: "inicio", etiqueta: "🏠 Inicio", href: "/admin/index.html" },
  { id: "productos", etiqueta: "💍 Productos", href: "/admin/productos.html" },
  { id: "pedidos", etiqueta: "🧾 Pedidos", href: "/admin/pedidos.html" },
  // "Taller" no es un link fijo: cada clic pide un acceso firmado de un
  // solo uso (ver api/admin/[seccion].js → acceso-taller) para entrar
  // directo a dinar-3dwax sin volver a escribir su contraseña.
  { id: "taller", etiqueta: "🏭 Taller", href: "#", accesoDinamico: "acceso-taller" },
  { id: "trabajadores", etiqueta: "👷 Trabajadores", href: "/admin/trabajadores.html" },
  { id: "materiales", etiqueta: "🧱 Materiales", href: "/admin/materiales.html" },
  { id: "pagos", etiqueta: "💵 Pagos", href: "/admin/pagos.html" },
  { id: "configuracion", etiqueta: "⚙️ Configuración", href: "/admin/configuracion.html" },
];

function renderAdminSidebar(seccionActiva) {
  const nav = document.getElementById("admin-sidebar-nav");
  if (!nav) return;
  nav.innerHTML = SECCIONES_ADMIN.map(
    (s) =>
      `<a href="${s.href}" class="${s.id === seccionActiva ? "activo" : ""}"${
        s.accesoDinamico ? ` data-acceso-dinamico="${s.accesoDinamico}"` : ""
      }>${s.etiqueta}</a>`
  ).join("");

  nav.querySelectorAll("[data-acceso-dinamico]").forEach((enlace) => {
    enlace.addEventListener("click", async (e) => {
      e.preventDefault();
      const textoOriginal = enlace.textContent;
      enlace.textContent = "Abriendo...";
      try {
        const r = await fetch(`/api/admin/${enlace.getAttribute("data-acceso-dinamico")}`);
        if (r.status === 401) {
          window.location.href = "/admin/login.html";
          return;
        }
        const datos = await r.json();
        if (!r.ok) throw new Error(datos.error || "No se pudo abrir");
        window.location.href = datos.url;
      } catch (err) {
        alert("No se pudo abrir el taller. Intenta de nuevo.");
        enlace.textContent = textoOriginal;
      }
    });
  });
}
