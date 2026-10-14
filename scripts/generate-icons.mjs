/**
 * Genera los íconos de la PWA a partir del monograma dorado de
 * img/logo-splash.png (recortado, sin el wordmark "DINAR 3D WAX" de abajo:
 * a tamaño de ícono el texto es ilegible). Reproducible: `node
 * scripts/generate-icons.mjs` vuelve a generar todo igual.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, "..");
const LOGO = path.join(RAIZ, "img/logo-splash.png");
const DESTINO = path.join(RAIZ, "icons");

// Caja del monograma dentro de logo-splash.png (500x500), medida sobre el
// canal alfa: el wordmark empieza varias filas más abajo, así que no entra.
const RECORTE_MONOGRAMA = { left: 120, top: 92, width: 240, height: 244 };

const FONDO_OSCURO = "#1a1a1a";

mkdirSync(DESTINO, { recursive: true });

async function monogramaRecortado() {
  return sharp(LOGO).extract(RECORTE_MONOGRAMA).toBuffer();
}

/** Ícono cuadrado con esquinas redondeadas sobre fondo oscuro (purpose "any"). */
async function generarIconoAny(tamano, archivo) {
  const monograma = await monogramaRecortado();
  const escala = Math.round(tamano * 0.62);
  const monogramaResize = await sharp(monograma)
    .resize(escala, escala, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const radio = Math.round(tamano * 0.22);
  const mascara = Buffer.from(
    `<svg width="${tamano}" height="${tamano}"><rect x="0" y="0" width="${tamano}" height="${tamano}" rx="${radio}" ry="${radio}" fill="#fff"/></svg>`
  );

  await sharp({
    create: { width: tamano, height: tamano, channels: 4, background: FONDO_OSCURO },
  })
    .composite([
      { input: monogramaResize, gravity: "center" },
      { input: mascara, blend: "dest-in" },
    ])
    .png()
    .toFile(path.join(DESTINO, archivo));
}

/** Ícono maskable: fondo a sangre completa, sin transparencia, dibujo en la
 * zona segura central (~80%) para que el recorte circular/squircle de
 * Android no se coma el monograma. */
async function generarIconoMaskable(tamano, archivo) {
  const monograma = await monogramaRecortado();
  const escala = Math.round(tamano * 0.5); // deja margen de sobra dentro del 80% seguro
  const monogramaResize = await sharp(monograma)
    .resize(escala, escala, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: tamano, height: tamano, channels: 3, background: FONDO_OSCURO },
  })
    .composite([{ input: monogramaResize, gravity: "center" }])
    .flatten({ background: FONDO_OSCURO })
    .png()
    .toFile(path.join(DESTINO, archivo));
}

/** Ícono de iPhone: cuadrado, sin transparencia (iOS pone su propio
 * redondeado), mismo tratamiento visual que el ícono "any". */
async function generarAppleIcon() {
  const monograma = await monogramaRecortado();
  const tamano = 180;
  const escala = Math.round(tamano * 0.62);
  const monogramaResize = await sharp(monograma)
    .resize(escala, escala, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: tamano, height: tamano, channels: 3, background: FONDO_OSCURO },
  })
    .composite([{ input: monogramaResize, gravity: "center" }])
    .flatten({ background: FONDO_OSCURO })
    .png()
    .toFile(path.join(RAIZ, "apple-icon.png"));
}

async function generarFavicon() {
  const monograma = await monogramaRecortado();
  const tamano = 48;
  const escala = Math.round(tamano * 0.62);
  const monogramaResize = await sharp(monograma)
    .resize(escala, escala, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: tamano, height: tamano, channels: 4, background: FONDO_OSCURO },
  })
    .composite([{ input: monogramaResize, gravity: "center" }])
    .png()
    .toFile(path.join(RAIZ, "favicon.png"));
}

async function main() {
  await generarIconoAny(192, "icon-192.png");
  await generarIconoAny(512, "icon-512.png");
  await generarIconoMaskable(512, "icon-512-maskable.png");
  await generarAppleIcon();
  await generarFavicon();
  console.log("Íconos generados en /icons, /apple-icon.png y /favicon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
