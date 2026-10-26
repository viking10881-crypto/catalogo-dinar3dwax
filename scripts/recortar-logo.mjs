/**
 * Genera img/logo-dinar3dwax-navbar.png: el logo sin el margen
 * transparente que trae el original (el dibujo ocupa solo ~49% de su alto),
 * para que en la barra de navegación se vea al tamaño real del espacio.
 * Reproducible: `node scripts/recortar-logo.mjs` (correr de nuevo si cambia
 * img/logo-dinar3dwax.png).
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = path.join(RAIZ, "img/logo-dinar3dwax.png");
const DESTINO = path.join(RAIZ, "img/logo-dinar3dwax-navbar.png");

// trim() quita el borde transparente; se devuelven 4px de aire para que el
// brillo dorado de los bordes no quede cortado al ras.
const recortado = await sharp(ORIGEN).trim({ threshold: 10 }).toBuffer();
await sharp(recortado)
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(DESTINO);

const { width, height } = await sharp(DESTINO).metadata();
console.log(`Logo para la barra generado: ${width}x${height}`);
