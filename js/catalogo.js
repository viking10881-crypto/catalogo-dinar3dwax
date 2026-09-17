/**
 * Lógica del catálogo principal: filtros, búsqueda por referencia y render de tarjetas.
 */
const NOMBRES_CATEGORIA = {
  anillos: "Anillos",
  dijes: "Dijes",
  aretes: "Aretes",
  cadenas: "Cadenas",
  pulseras: "Pulseras",
};

function tarjetaProductoHTML(producto) {
  const portada = (producto.imagenes && producto.imagenes[0]) || "";
  return `
    <article class="tarjeta-producto">
      <a class="render" data-tipo="${producto.tipo}" href="producto.html?ref=${producto.referencia}">
        ${portada ? `<img src="${portada}" alt="${producto.nombre}" onerror="this.remove()">` : ""}
      </a>
      <div class="info-tarjeta">
        <span class="ref">${producto.referencia}</span>
        <span class="nombre">${producto.nombre}</span>
        <span class="peso">${producto.peso} g</span>
        <span class="precio">${formatearPrecio(producto.precioBase)}</span>
      </div>
      <a class="btn-ver" href="producto.html?ref=${producto.referencia}">Ver modelo</a>
    </article>
  `;
}

function obtenerFiltrosActuales() {
  const categoriaEl = document.querySelector('input[name="filtro-categoria"]:checked');
  const pesoEl = document.getElementById("filtro-peso");
  return {
    categoria: categoriaEl ? categoriaEl.value : "todos",
    pesoMax: pesoEl ? parseFloat(pesoEl.value) : 999,
  };
}

function renderCatalogo() {
  const contenedor = document.getElementById("resultado-catalogo");
  if (!contenedor) return;

  const { categoria, pesoMax } = obtenerFiltrosActuales();

  const pesoSalida = document.getElementById("salida-peso");
  if (pesoSalida) pesoSalida.textContent = pesoMax + " g";

  const filtrados = PRODUCTOS.filter((p) => {
    if (categoria !== "todos" && p.tipo !== categoria) return false;
    if (p.peso > pesoMax) return false;
    return true;
  });

  if (filtrados.length === 0) {
    contenedor.innerHTML = `<p class="sin-resultados">No hay modelos que coincidan con los filtros seleccionados.</p>`;
    return;
  }

  const categorias = categoria === "todos" ? Object.keys(NOMBRES_CATEGORIA) : [categoria];

  contenedor.innerHTML = categorias
    .map((cat) => {
      const items = filtrados.filter((p) => p.tipo === cat);
      if (items.length === 0) return "";
      return `
        <section class="seccion-categoria">
          <h2 class="titulo-seccion">${NOMBRES_CATEGORIA[cat]}</h2>
          <div class="grid-productos">
            ${items.map(tarjetaProductoHTML).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function irAReferencia(valor) {
  const ref = valor.trim().toUpperCase();
  if (!ref) return;
  const producto = buscarProducto(ref);
  if (producto) {
    window.location.href = `producto.html?ref=${producto.referencia}`;
  } else {
    alert(`No encontramos la referencia "${ref}".`);
  }
}

/**
 * El slider de peso debe cubrir siempre el catálogo real: si un producto
 * queda por encima del tope fijo del slider, desaparece de la vista por
 * defecto sin ningún aviso. Se recalcula el tope con lo que realmente hay
 * en PRODUCTOS (con un pequeño margen) al cargar.
 */
function ajustarRangosFiltro() {
  if (PRODUCTOS.length === 0) return;

  const pesoEl = document.getElementById("filtro-peso");
  if (pesoEl) {
    const tope = Math.ceil(Math.max(...PRODUCTOS.map((p) => p.peso)) * 1.05) || 20;
    pesoEl.max = tope;
    pesoEl.value = tope;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await productosListos;
  ajustarRangosFiltro();
  renderCatalogo();

  document.querySelectorAll('input[name="filtro-categoria"]').forEach((el) => {
    el.addEventListener("change", renderCatalogo);
  });
  const pesoEl = document.getElementById("filtro-peso");
  if (pesoEl) pesoEl.addEventListener("input", renderCatalogo);

  const btnLimpiar = document.getElementById("btn-limpiar-filtros");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      const todos = document.getElementById("cat-todos");
      if (todos) todos.checked = true;
      if (pesoEl) pesoEl.value = pesoEl.max;
      renderCatalogo();
    });
  }

  // Buscador rápido de la cabecera
  const formBusquedaRapida = document.getElementById("form-busqueda-rapida");
  if (formBusquedaRapida) {
    formBusquedaRapida.addEventListener("submit", (e) => {
      e.preventDefault();
      irAReferencia(document.getElementById("campo-busqueda-rapida").value);
    });
  }

});
