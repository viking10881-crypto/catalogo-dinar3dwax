/**
 * Lógica del catálogo principal: filtros (categoría, subcategoría, peso),
 * búsqueda por referencia, banner administrable y render de tarjetas.
 * NOMBRES_CATEGORIA y construirArbolCategorias() viven en productos.js
 * (compartidos con el menú de categorías de la barra de navegación).
 */
let subcategoriaActual = "";

function tarjetaProductoHTML(producto) {
  const portada = (producto.imagenes && producto.imagenes[0]) || "";
  const eyebrow = producto.subcategoria || NOMBRES_CATEGORIA[producto.tipo] || producto.tipo;
  return `
    <article class="tarjeta-producto">
      <a class="render" data-tipo="${producto.tipo}" href="producto.html?ref=${producto.referencia}">
        ${portada ? `<img src="${portada}" alt="${producto.nombre}" onerror="this.remove()">` : ""}
        <span class="badge-ref-tarjeta">${producto.referencia}</span>
        <span class="badge-material-tarjeta">Cera 3D</span>
      </a>
      <div class="info-tarjeta">
        <span class="categoria-eyebrow">${eyebrow}</span>
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
    subcategoria: subcategoriaActual,
    pesoMax: pesoEl ? parseFloat(pesoEl.value) : 999,
  };
}

function renderCatalogo() {
  const contenedor = document.getElementById("resultado-catalogo");
  if (!contenedor) return;

  const { categoria, subcategoria, pesoMax } = obtenerFiltrosActuales();

  const pesoSalida = document.getElementById("salida-peso");
  if (pesoSalida) pesoSalida.textContent = pesoMax + " g";

  const filtrados = PRODUCTOS.filter((p) => {
    if (categoria !== "todos" && p.tipo !== categoria) return false;
    if (subcategoria && p.subcategoria !== subcategoria) return false;
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

/**
 * El árbol de categorías/subcategorías se arma con lo que realmente exista
 * en PRODUCTOS (no hay una lista fija de subcategorías en el admin): cada
 * categoría que tenga al menos un producto con subcategoria no vacía se
 * muestra expandible.
 */
function renderArbolCategorias() {
  const contenedor = document.getElementById("arbol-categorias");
  if (!contenedor) return;

  const grupos = construirArbolCategorias()
    .map(({ tipo, etiqueta, subcategorias }) => {
      const tieneSubcats = subcategorias.length > 0;
      return `
        <div class="categoria-grupo" data-categoria="${tipo}">
          <div class="categoria-grupo-cabecera">
            <label class="opcion-filtro">
              <input type="radio" name="filtro-categoria" value="${tipo}"> ${etiqueta}
            </label>
            ${tieneSubcats ? `<button type="button" class="btn-expandir-subcategoria" data-categoria="${tipo}">▾</button>` : ""}
          </div>
          ${
            tieneSubcats
              ? `<div class="lista-subcategorias">
                  ${subcategorias
                    .map(
                      (s) => `
                    <label class="opcion-subcategoria">
                      <input type="radio" name="filtro-subcategoria" value="${s}" data-categoria-padre="${tipo}"> ${s}
                    </label>
                  `
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  contenedor.innerHTML = grupos;
}

/**
 * Aplica el filtro de categoría/subcategoría que venga en la URL
 * (?categoria=anillos&subcategoria=Solitario), usado por los links del
 * menú desplegable "Categorías" de la barra de navegación (ver
 * js/nav-categorias.js). Si no hay params, o no coinciden con nada real,
 * no toca el estado por defecto ("Todos").
 */
function aplicarFiltroDesdeUrl() {
  const params = new URLSearchParams(window.location.search);
  const categoria = params.get("categoria");
  const subcategoria = params.get("subcategoria");
  if (!categoria || !NOMBRES_CATEGORIA[categoria]) return;

  const radioCategoria = [...document.querySelectorAll('input[name="filtro-categoria"]')].find(
    (el) => el.value === categoria
  );
  if (!radioCategoria) return;
  radioCategoria.checked = true;

  if (subcategoria) {
    const radioSubcategoria = [...document.querySelectorAll('input[name="filtro-subcategoria"]')].find(
      (el) => el.value === subcategoria && el.getAttribute("data-categoria-padre") === categoria
    );
    if (radioSubcategoria) {
      radioSubcategoria.checked = true;
      subcategoriaActual = subcategoria;
      radioSubcategoria.closest(".categoria-grupo").classList.add("abierta");
    }
  }

  document.querySelector(".zona-catalogo")?.scrollIntoView({ block: "start" });
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

/**
 * Banner del hero del catálogo: 0 imágenes = queda el fondo degradado por
 * defecto; 1 = fija; 2+ = carrusel con rotación automática y puntos.
 */
function iniciarBannerCatalogo(imagenes) {
  const hero = document.getElementById("hero-catalogo");
  if (!hero || !Array.isArray(imagenes) || imagenes.length === 0) return;

  hero.classList.add("con-banner");
  const capa = hero.querySelector(".capa-banner");
  const puntosContenedor = hero.querySelector(".puntos-banner");

  capa.innerHTML = imagenes
    .map((url, i) => `<img class="imagen-banner${i === 0 ? " activa" : ""}" src="${url}" alt="">`)
    .join("");

  if (imagenes.length === 1) return;

  puntosContenedor.innerHTML = imagenes
    .map((_, i) => `<button type="button" data-indice="${i}" class="${i === 0 ? "activo" : ""}"></button>`)
    .join("");

  let indiceActual = 0;
  const imgs = capa.querySelectorAll(".imagen-banner");
  const puntos = puntosContenedor.querySelectorAll("button");

  function mostrar(indice) {
    imgs.forEach((img, i) => img.classList.toggle("activa", i === indice));
    puntos.forEach((p, i) => p.classList.toggle("activo", i === indice));
    indiceActual = indice;
  }

  puntosContenedor.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-indice]");
    if (!btn) return;
    mostrar(Number(btn.getAttribute("data-indice")));
  });

  setInterval(() => {
    mostrar((indiceActual + 1) % imagenes.length);
  }, 5000);
}

/**
 * Botón flotante de WhatsApp del catálogo: usa el número configurado en
 * /admin/configuracion.html (CONFIG.whatsappNumero), no uno fijo, para que
 * si el cliente lo cambia en el admin, este botón lo refleje solo.
 */
function configurarBotonWhatsapp() {
  const boton = document.getElementById("btn-whatsapp-flotante");
  if (!boton) return;
  const mensaje = encodeURIComponent("Hola Dinar 3D Wax, quisiera más información sobre su catálogo de modelos.");
  boton.href = `https://wa.me/${CONFIG.whatsappNumero}?text=${mensaje}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await productosListos;
  renderArbolCategorias();
  ajustarRangosFiltro();
  aplicarFiltroDesdeUrl();
  renderCatalogo();

  // configuracionLista no resuelve con el objeto de configuración: lo
  // mezcla dentro de CONFIG (ver js/productos.js) y no retorna nada.
  await configuracionLista.catch(() => null);
  iniciarBannerCatalogo(CONFIG.bannerImagenes);
  configurarBotonWhatsapp();

  // Delegado en todo el panel (no solo #arbol-categorias) para que también
  // cubra el radio "Todos", que vive fuera del árbol generado dinámicamente.
  const panelFiltros = document.querySelector(".panel-filtros");
  if (panelFiltros) {
    panelFiltros.addEventListener("change", (e) => {
      if (e.target.name === "filtro-categoria") {
        subcategoriaActual = "";
        document.querySelectorAll('input[name="filtro-subcategoria"]').forEach((el) => (el.checked = false));
        renderCatalogo();
      } else if (e.target.name === "filtro-subcategoria") {
        subcategoriaActual = e.target.value;
        const categoriaPadre = e.target.getAttribute("data-categoria-padre");
        const radioCategoria = document.querySelector(`input[name="filtro-categoria"][value="${categoriaPadre}"]`);
        if (radioCategoria) radioCategoria.checked = true;
        renderCatalogo();
      }
    });

    panelFiltros.addEventListener("click", (e) => {
      const btn = e.target.closest("button.btn-expandir-subcategoria");
      if (!btn) return;
      btn.closest(".categoria-grupo").classList.toggle("abierta");
    });
  }

  const pesoEl = document.getElementById("filtro-peso");
  if (pesoEl) pesoEl.addEventListener("input", renderCatalogo);

  const btnLimpiar = document.getElementById("btn-limpiar-filtros");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      const todos = document.getElementById("cat-todos");
      if (todos) todos.checked = true;
      subcategoriaActual = "";
      document.querySelectorAll('input[name="filtro-subcategoria"]').forEach((el) => (el.checked = false));
      if (pesoEl) pesoEl.value = pesoEl.max;
      renderCatalogo();
    });
  }

  // Buscador del hero (reemplaza al que antes vivía en el header)
  const formBusquedaHero = document.getElementById("form-busqueda-hero");
  if (formBusquedaHero) {
    formBusquedaHero.addEventListener("submit", (e) => {
      e.preventDefault();
      irAReferencia(document.getElementById("campo-busqueda-hero").value);
    });
  }
});
