/**
 * Service worker del catálogo público. Reglas de privacidad:
 * NUNCA cachea páginas HTML, respuestas de /api/* ni nada con datos de
 * usuario (carrito, pedidos, config del admin). Solo cachea archivos
 * estáticos propios (css/js/imágenes/íconos) y la página offline.
 */
const VERSION = "v4";
const CACHE_ESTATICOS = `dinar3dwax-estaticos-${VERSION}`;
const CACHE_PAGINAS = `dinar3dwax-offline-${VERSION}`;
const MAX_ENTRADAS_ESTATICOS = 80;

const OFFLINE_URL = "/offline.html";

const PRECARGA_ESTATICOS = [
  "/css/estilos.css",
  "/js/tema.js",
  "/js/productos.js",
  "/js/carrito.js",
  "/js/catalogo.js",
  "/js/producto.js",
  "/js/visor-stl.js",
  "/js/checkout.js",
  "/js/confirmacion.js",
  "/js/personalizados.js",
  "/js/impresion-stl.js",
  "/img/logo-dinar3dwax.png",
  "/img/logo-splash.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/apple-icon.png",
  "/favicon.png",
  "/manifest.webmanifest",
];

const EXTENSIONES_ESTATICAS = /\.(css|js|png|jpe?g|webp|svg|gif|ico|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_ESTATICOS).then((cache) => cache.addAll(PRECARGA_ESTATICOS)),
      caches.open(CACHE_PAGINAS).then((cache) => cache.addAll([OFFLINE_URL])),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((n) => n !== CACHE_ESTATICOS && n !== CACHE_PAGINAS)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Recorta la caché de estáticos por tamaño (FIFO simple): sin esto crece
 * sin límite a medida que el admin sube nuevas imágenes/íconos. */
async function recortarCache(nombreCache, maxEntradas) {
  const cache = await caches.open(nombreCache);
  const claves = await cache.keys();
  if (claves.length <= maxEntradas) return;
  await Promise.all(claves.slice(0, claves.length - maxEntradas).map((k) => cache.delete(k)));
}

async function responderEstatico(request) {
  const cache = await caches.open(CACHE_ESTATICOS);
  const enCache = await cache.match(request);
  if (enCache) return enCache;

  const respuesta = await fetch(request);
  if (respuesta.ok) {
    cache.put(request, respuesta.clone());
    recortarCache(CACHE_ESTATICOS, MAX_ENTRADAS_ESTATICOS);
  }
  return respuesta;
}

async function responderNavegacion(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_PAGINAS);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear /api/*: son datos (productos, pedidos, config), no estáticos.
  if (url.pathname.startsWith("/api/")) return;

  // Nunca cachear /admin/*: el SW tiene scope de origen completo ("/") aunque
  // solo se registra desde las páginas públicas, así que sin esta exclusión
  // interceptaba igual css/js del panel (ver /admin/js/layout.js) y los
  // servía viejos desde caché para siempre, sin importar los deploys nuevos.
  if (url.pathname.startsWith("/admin/")) return;

  if (request.mode === "navigate") {
    event.respondWith(responderNavegacion(request));
    return;
  }

  if (EXTENSIONES_ESTATICAS.test(url.pathname)) {
    event.respondWith(responderEstatico(request));
  }
});
