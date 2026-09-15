/**
 * Configuración general del sitio y carga del catálogo de productos.
 * Los productos ya no viven hardcodeados aquí: se administran desde el
 * panel de administración (/admin) y se sirven vía GET /api/productos.
 */
const CONFIG = {
  nombreSitio: "Dinar 3D Wax",
  monedaSimbolo: "$",
  ordenPrefijo: "DINAR",
  // Valores por defecto mientras responde /api/configuracion (editables
  // desde /admin/configuracion.html — ver configuracionLista más abajo).
  whatsappNumero: "573028432867",
  divisorPesoOro18k: 16.5,
  precioPorGramoCera: 50000,
};

/**
 * Fórmula de la calculadora de servicio: el peso ingresado (equivalente en
 * oro 18k) se convierte a peso en cera dividiendo por `divisorPesoOro18k`,
 * truncando (no redondeando) a 2 decimales, y ese valor se multiplica por
 * `precioPorGramoCera`. Ej: 10 g → 10/16.5 = 0.6060... → se corta a 0.60 →
 * 0.60 × 50.000 = $30.000.
 */
function calcularPrecioServicio(pesoOro18k) {
  const pesoCera = Math.trunc((pesoOro18k / CONFIG.divisorPesoOro18k) * 100) / 100;
  return Math.round(pesoCera * CONFIG.precioPorGramoCera);
}

let PRODUCTOS = [];

/**
 * Promesa que resuelve cuando PRODUCTOS ya se cargó desde la API. Cualquier
 * script que necesite leer PRODUCTOS debe esperarla primero:
 *   document.addEventListener("DOMContentLoaded", async () => {
 *     await productosListos;
 *     ...
 *   });
 */
const productosListos = fetch("/api/productos")
  .then((r) => {
    if (!r.ok) throw new Error("respuesta no válida");
    return r.json();
  })
  .then((datos) => {
    PRODUCTOS = datos;
  })
  .catch((err) => {
    console.error("No se pudo cargar el catálogo:", err);
    PRODUCTOS = [];
  });

/**
 * Igual que productosListos, pero para los valores editables de CONFIG
 * (WhatsApp, fórmula de la calculadora). Cualquier script que dependa de
 * ellos antes del primer render del usuario debe esperar esta promesa.
 */
const configuracionLista = fetch("/api/configuracion")
  .then((r) => {
    if (!r.ok) throw new Error("respuesta no válida");
    return r.json();
  })
  .then((datos) => {
    Object.assign(CONFIG, datos);
  })
  .catch((err) => {
    console.error("No se pudo cargar la configuración, se usan los valores por defecto:", err);
  });
