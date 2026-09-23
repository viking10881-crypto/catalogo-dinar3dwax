/**
 * Menú desplegable de "Categorías" en la barra de navegación (las 6
 * páginas públicas): lista cada categoría con sus subcategorías reales —
 * armadas con construirArbolCategorias(), ver js/productos.js — y cada
 * link navega a index.html con el filtro correspondiente en la URL
 * (?categoria=&subcategoria=), que catalogo.js lee al cargar
 * (aplicarFiltroDesdeUrl).
 */
function generarPanelCategoriasHTML() {
  const bloques = construirArbolCategorias()
    .map(({ tipo, etiqueta, subcategorias }) => {
      const linkCategoria = `<a href="index.html?categoria=${tipo}" class="nav-cat-categoria">${etiqueta}</a>`;
      if (subcategorias.length === 0) return `<div class="nav-cat-grupo">${linkCategoria}</div>`;
      const subLinks = subcategorias
        .map(
          (s) =>
            `<a href="index.html?categoria=${tipo}&subcategoria=${encodeURIComponent(s)}" class="nav-cat-subcategoria">${s}</a>`
        )
        .join("");
      return `<div class="nav-cat-grupo">${linkCategoria}<div class="nav-cat-subs">${subLinks}</div></div>`;
    })
    .join("");

  return `<a href="index.html" class="nav-cat-categoria nav-cat-todos">Ver todo el catálogo</a>${bloques}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.querySelector(".nav-categorias");
  const toggle = document.getElementById("nav-categorias-toggle");
  const panel = document.getElementById("nav-categorias-panel");
  if (!contenedor || !toggle || !panel) return;

  function cerrar() {
    contenedor.classList.remove("abierto");
    toggle.setAttribute("aria-expanded", "false");
  }

  function alternar() {
    const abierto = contenedor.classList.toggle("abierto");
    toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    alternar();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-categorias")) cerrar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrar();
  });

  await productosListos;
  panel.innerHTML = generarPanelCategoriasHTML();
});
