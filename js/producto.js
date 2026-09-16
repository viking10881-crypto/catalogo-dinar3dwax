/**
 * Lógica de la ficha de producto (producto.html?ref=AN-025)
 */
const NOMBRES_TIPO = {
  anillos: "Anillo",
  dijes: "Dije",
  aretes: "Aretes",
  cadenas: "Cadena",
  pulseras: "Pulsera",
};

let productoActual = null;
let tallaSeleccionada = null;

function mostrarImagenPrincipal(url) {
  const render = document.getElementById("ficha-render");
  render.innerHTML = url
    ? `<img src="${url}" alt="${productoActual ? productoActual.nombre : ""}" onerror="this.remove()">`
    : "";
}

function renderFichaProducto() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  productoActual = ref ? buscarProducto(ref) : null;

  const contenedor = document.getElementById("ficha-producto");
  const noEncontrado = document.getElementById("producto-no-encontrado");

  if (!productoActual) {
    if (contenedor) contenedor.classList.add("oculto");
    if (noEncontrado) noEncontrado.classList.remove("oculto");
    return;
  }
  if (noEncontrado) noEncontrado.classList.add("oculto");
  if (contenedor) contenedor.classList.remove("oculto");

  document.title = `${productoActual.referencia} · ${productoActual.nombre} · Dinar 3D Wax`;

  document.getElementById("ficha-ref").textContent = `REF. ${productoActual.referencia}`;
  document.getElementById("ficha-nombre").textContent = productoActual.nombre;
  document.getElementById("ficha-descripcion").textContent = productoActual.descripcion;

  // Galería de imágenes (la primera es la portada / imagen principal)
  const imagenes = productoActual.imagenes || [];
  const render = document.getElementById("ficha-render");
  render.setAttribute("data-tipo", productoActual.tipo);
  mostrarImagenPrincipal(imagenes[0] || "");

  const galeria = document.getElementById("galeria-miniaturas");
  if (imagenes.length > 1) {
    galeria.classList.remove("oculto");
    galeria.innerHTML = imagenes
      .map(
        (url, i) => `
          <button type="button" class="miniatura-galeria ${i === 0 ? "activa" : ""}" data-src="${url}">
            <img src="${url}" alt="${productoActual.nombre} ${i + 1}">
          </button>
        `
      )
      .join("");
  } else {
    galeria.classList.add("oculto");
    galeria.innerHTML = "";
  }

  // Tabla de especificaciones
  const filas = [];
  filas.push(["Tipo", NOMBRES_TIPO[productoActual.tipo] || productoActual.tipo]);
  filas.push(["Material", productoActual.material]);
  filas.push(["Peso cera", `${productoActual.pesoCera} g`]);
  filas.push(["Tipo material", productoActual.materialTipo]);
  filas.push(["Peso material", `${productoActual.peso} g`]);
  if (productoActual.tallas.length > 0) {
    filas.push(["Tallas disponibles", productoActual.tallas.join(" / ")]);
  }

  document.getElementById("tabla-specs").innerHTML = filas
    .map(([etiqueta, valor]) => `<tr><td>${etiqueta}</td><td>${valor}</td></tr>`)
    .join("");

  // Selector de talla
  const bloqueTalla = document.getElementById("bloque-talla");
  if (productoActual.tallas.length > 0) {
    bloqueTalla.classList.remove("oculto");
    tallaSeleccionada = productoActual.tallas[0];
    document.getElementById("opciones-talla").innerHTML = productoActual.tallas
      .map(
        (t, i) =>
          `<button type="button" class="${i === 0 ? "activo" : ""}" data-talla="${t}">${t}</button>`
      )
      .join("");
  } else {
    bloqueTalla.classList.add("oculto");
    tallaSeleccionada = null;
  }

  // Visor 3D del archivo STL (si el producto tiene uno cargado). No se ofrece
  // descarga directa del archivo: solo la vista interactiva, para proteger
  // los diseños.
  const seccionStl = document.getElementById("seccion-visor-stl");
  if (productoActual.modeloStl) {
    seccionStl.classList.remove("oculto");
    if (typeof window.iniciarVisorSTL === "function") {
      window.iniciarVisorSTL("contenedor-visor-stl", productoActual.modeloStl, productoActual.material);
    }
  } else {
    seccionStl.classList.add("oculto");
  }

  actualizarPrecioFicha();
}

function actualizarPrecioFicha() {
  if (!productoActual) return;
  const cantidad = parseInt(document.getElementById("cantidad-ficha").value) || 1;
  const total = productoActual.precioBase * cantidad;
  document.getElementById("precio-ficha").textContent = formatearPrecio(total);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("ficha-producto")) return;

  await productosListos;
  renderFichaProducto();

  document.getElementById("galeria-miniaturas").addEventListener("click", (e) => {
    const boton = e.target.closest("button.miniatura-galeria");
    if (!boton) return;
    mostrarImagenPrincipal(boton.getAttribute("data-src"));
    document
      .querySelectorAll("#galeria-miniaturas button")
      .forEach((b) => b.classList.toggle("activa", b === boton));
  });

  document.getElementById("opciones-talla").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-talla]");
    if (!boton) return;
    tallaSeleccionada = boton.getAttribute("data-talla");
    document
      .querySelectorAll("#opciones-talla button")
      .forEach((b) => b.classList.toggle("activo", b === boton));
  });

  const campoCantidad = document.getElementById("cantidad-ficha");
  document.getElementById("btn-menos-ficha").addEventListener("click", () => {
    campoCantidad.value = Math.max(1, (parseInt(campoCantidad.value) || 1) - 1);
    actualizarPrecioFicha();
  });
  document.getElementById("btn-mas-ficha").addEventListener("click", () => {
    campoCantidad.value = (parseInt(campoCantidad.value) || 1) + 1;
    actualizarPrecioFicha();
  });
  campoCantidad.addEventListener("input", actualizarPrecioFicha);

  document.getElementById("btn-agregar-carrito").addEventListener("click", () => {
    if (!productoActual) return;
    const cantidad = parseInt(campoCantidad.value) || 1;
    agregarAlCarrito(productoActual.referencia, cantidad, tallaSeleccionada);
    window.location.href = "carrito.html";
  });
});
