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
const conAire = await sharp(recortado)
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
// En la barra se muestra a ~145px de ancho: 440px cubre pantallas 3x de
// celular. Con paleta (PNG-8) pesa ~12 KB en vez de ~62 KB, sin bandas
// visibles en el dorado (comparado a 2x de zoom).
await sharp(conAire)
  .resize({ width: 440 })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(DESTINO);

const { width, height } = await sharp(DESTINO).metadata();
console.log(`Logo para la barra generado: ${width}x${height}`);
