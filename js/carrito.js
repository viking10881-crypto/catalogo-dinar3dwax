/**
 * Manejo del carrito de compras usando localStorage.
 * Estructura de cada línea: { referencia, cantidad, talla }
 */
const CLAVE_CARRITO = "dinar_carrito";

function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch (e) {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  actualizarContadorCarritoUI();
}

function buscarProducto(referencia) {
  return PRODUCTOS.find((p) => p.referencia.toUpperCase() === String(referencia).toUpperCase());
}

function agregarAlCarrito(referencia, cantidad, talla) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(
    (l) => l.referencia === referencia && (l.talla || "") === (talla || "")
  );
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ referencia, cantidad, talla: talla || "" });
  }
  guardarCarrito(carrito);
}

/**
 * Agrega una pieza personalizada cotizada con la calculadora (sin referencia de catálogo).
 */
function agregarPersonalizadoAlCarrito({ peso, volumen, precioUnitario, cantidad }) {
  const carrito = obtenerCarrito();
  carrito.push({
    referencia: null,
    personalizado: true,
    nombre: "Pieza personalizada",
    peso,
    volumen,
    precioUnitario,
    cantidad,
    talla: "",
  });
  guardarCarrito(carrito);
}

/**
 * Devuelve los datos de visualización de una línea del carrito,
 * ya sea un producto del catálogo o una pieza personalizada.
 */
function infoLineaCarrito(linea) {
  if (linea.personalizado) {
    return {
      referencia: "PERSONALIZADO",
      nombre: `Pieza personalizada (${linea.peso} g · ${linea.volumen} cm³)`,
      imagen: "",
      precioUnitario: linea.precioUnitario,
    };
  }
  const producto = buscarProducto(linea.referencia);
  if (!producto) return null;
  return {
    referencia: producto.referencia,
    nombre: producto.nombre,
    imagen: (producto.imagenes && producto.imagenes[0]) || "",
    precioUnitario: producto.precioBase,
  };
}

function quitarDelCarrito(indice) {
  const carrito = obtenerCarrito();
  carrito.splice(indice, 1);
  guardarCarrito(carrito);
  if (typeof renderizarCarrito === "function") renderizarCarrito();
}

function actualizarCantidadCarrito(indice, cantidad) {
  const carrito = obtenerCarrito();
  if (!carrito[indice]) return;
  carrito[indice].cantidad = Math.max(1, cantidad);
  guardarCarrito(carrito);
  if (typeof renderizarCarrito === "function") renderizarCarrito();
}

function vaciarCarrito() {
  localStorage.removeItem(CLAVE_CARRITO);
  actualizarContadorCarritoUI();
}

function contarItemsCarrito() {
  return obtenerCarrito().reduce((total, l) => total + l.cantidad, 0);
}

function calcularSubtotalCarrito() {
  const carrito = obtenerCarrito();
  return carrito.reduce((total, linea) => {
    const info = infoLineaCarrito(linea);
    if (!info) return total;
    return total + info.precioUnitario * linea.cantidad;
  }, 0);
}

function formatearPrecio(numero) {
  return CONFIG.monedaSimbolo + Math.round(numero).toLocaleString("es-CO");
}

function actualizarContadorCarritoUI() {
  document.querySelectorAll("[data-contador-carrito]").forEach((el) => {
    el.textContent = contarItemsCarrito();
  });
}

/* ===== Render de la página del carrito (carrito.html) ===== */
function renderizarCarrito() {
  const contenedor = document.getElementById("lista-carrito");
  if (!contenedor) return;

  const carrito = obtenerCarrito();
  const vacioEl = document.getElementById("carrito-vacio");
  const resumenEl = document.getElementById("resumen-pedido");

  if (carrito.length === 0) {
    contenedor.innerHTML = "";
    if (vacioEl) vacioEl.classList.remove("oculto");
    if (resumenEl) resumenEl.classList.add("oculto");
    return;
  }

  if (vacioEl) vacioEl.classList.add("oculto");
  if (resumenEl) resumenEl.classList.remove("oculto");

  contenedor.innerHTML = carrito
    .map((linea, indice) => {
      const info = infoLineaCarrito(linea);
      if (!info) return "";
      const subtotalLinea = info.precioUnitario * linea.cantidad;
      return `
        <div class="fila-carrito">
          <div class="render-mini">
            ${info.imagen ? `<img src="${info.imagen}" alt="${info.nombre}" onerror="this.remove()">` : ""}
          </div>
          <div class="detalle">
            <div class="ref">${info.referencia}</div>
            <div class="nombre">${info.nombre}</div>
            ${linea.talla ? `<div class="talla">Talla: ${linea.talla}</div>` : ""}
          </div>
          <div class="contador">
            <button type="button" onclick="actualizarCantidadCarrito(${indice}, ${linea.cantidad - 1})">−</button>
            <input type="number" min="1" value="${linea.cantidad}"
              onchange="actualizarCantidadCarrito(${indice}, parseInt(this.value) || 1)">
            <button type="button" onclick="actualizarCantidadCarrito(${indice}, ${linea.cantidad + 1})">+</button>
          </div>
          <div class="precio-linea">${formatearPrecio(subtotalLinea)}</div>
          <button type="button" class="quitar" onclick="quitarDelCarrito(${indice})">Quitar</button>
        </div>
      `;
    })
    .join("");

  const subtotal = calcularSubtotalCarrito();
  if (resumenEl) {
    resumenEl.querySelector("[data-subtotal]").textContent = formatearPrecio(subtotal);
    resumenEl.querySelector("[data-total]").textContent = formatearPrecio(subtotal);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await productosListos;
  actualizarContadorCarritoUI();
  renderizarCarrito();
});
