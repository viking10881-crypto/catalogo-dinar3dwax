/**
 * Migra el catálogo que hoy vive hardcodeado en js/productos.js hacia la
 * tabla `productos` (fuente única de verdad a partir de ahora). Es idempotente:
 * usa upsert por referencia, así que se puede correr varias veces sin duplicar.
 */
import { neon } from "@neondatabase/serverless";

const PRODUCTOS = [
  {
    referencia: "AN-025", tipo: "anillos", nombre: "Anillo modelo clásico",
    descripcion: "Anillo solitario de líneas clásicas, ideal para compromiso.",
    volumen: 0.45, peso: 4.35, precioBase: 12000, material: "Cera casteable rosa",
    medidas: { diametro: 20, grosor: 2.4, piedra: 6 }, tallas: [6, 7, 8, 9, 10],
    imagen: "img/anillos/an-025.jpg",
  },
  {
    referencia: "AN-031", tipo: "anillos", nombre: "Anillo trenzado doble",
    descripcion: "Anillo con textura trenzada, dos bandas entrelazadas.",
    volumen: 0.62, peso: 5.9, precioBase: 16000, material: "Cera casteable rosa",
    medidas: { diametro: 19, grosor: 3.1 }, tallas: [6, 7, 8, 9, 10, 11],
    imagen: "img/anillos/an-031.jpg",
  },
  {
    referencia: "AN-048", tipo: "anillos", nombre: "Anillo halo circular",
    descripcion: "Montura tipo halo con base para piedra central y laterales.",
    volumen: 0.81, peso: 7.8, precioBase: 21000, material: "Cera casteable rosa",
    medidas: { diametro: 21, grosor: 2.8, piedra: 7 }, tallas: [7, 8, 9, 10],
    imagen: "img/anillos/an-048.jpg",
  },
  {
    referencia: "DJ-018", tipo: "dijes", nombre: "Dije corazón",
    descripcion: "Dije clásico en forma de corazón, argolla reforzada.",
    volumen: 0.32, peso: 3.1, precioBase: 9000, material: "Cera casteable rosa",
    medidas: { alto: 14, ancho: 12, grosor: 2.2 }, tallas: [],
    imagen: "img/dijes/dj-018.jpg",
  },
  {
    referencia: "DJ-022", tipo: "dijes", nombre: "Dije inicial personalizada",
    descripcion: "Dije de letra, base plana lista para grabar.",
    volumen: 0.18, peso: 1.7, precioBase: 7000, material: "Cera casteable rosa",
    medidas: { alto: 16, ancho: 10, grosor: 1.8 }, tallas: [],
    imagen: "img/dijes/dj-022.jpg",
  },
  {
    referencia: "DJ-035", tipo: "dijes", nombre: "Dije virgen milagrosa",
    descripcion: "Dije religioso con detalle de bordes en relieve.",
    volumen: 0.41, peso: 4.0, precioBase: 11500, material: "Cera casteable rosa",
    medidas: { alto: 18, ancho: 11, grosor: 2.5 }, tallas: [],
    imagen: "img/dijes/dj-035.jpg",
  },
  {
    referencia: "AR-010", tipo: "aretes", nombre: "Aretes botón liso",
    descripcion: "Par de aretes tipo botón, base para piedra 4mm.",
    volumen: 0.14, peso: 1.3, precioBase: 6500, material: "Cera casteable rosa",
    medidas: { diametro: 8, grosor: 1.6, piedra: 4 }, tallas: [],
    imagen: "img/aretes/ar-010.jpg",
  },
  {
    referencia: "AR-014", tipo: "aretes", nombre: "Aretes candonga mini",
    descripcion: "Candonga pequeña con textura martillada.",
    volumen: 0.29, peso: 2.6, precioBase: 9500, material: "Cera casteable rosa",
    medidas: { alto: 22, ancho: 12, grosor: 1.4 }, tallas: [],
    imagen: "img/aretes/ar-014.jpg",
  },
  {
    referencia: "AR-021", tipo: "aretes", nombre: "Aretes largos cascada",
    descripcion: "Diseño largo en cascada con múltiples segmentos móviles.",
    volumen: 0.55, peso: 5.1, precioBase: 15500, material: "Cera casteable rosa",
    medidas: { alto: 45, ancho: 10, grosor: 1.5 }, tallas: [],
    imagen: "img/aretes/ar-021.jpg",
  },
  {
    referencia: "CA-005", tipo: "cadenas", nombre: "Cadena cubana 45cm",
    descripcion: "Cadena tipo cubana, eslabón macizo, cierre de mosquetón.",
    volumen: 1.85, peso: 17.4, precioBase: 48000, material: "Cera casteable verde",
    medidas: { largo: 450, ancho: 4 }, tallas: [],
    imagen: "img/cadenas/ca-005.jpg",
  },
  {
    referencia: "CA-009", tipo: "cadenas", nombre: "Cadena forzada fina",
    descripcion: "Cadena de eslabón forzado, ideal para dijes livianos.",
    volumen: 0.9, peso: 8.6, precioBase: 26000, material: "Cera casteable verde",
    medidas: { largo: 500, ancho: 1.8 }, tallas: [],
    imagen: "img/cadenas/ca-009.jpg",
  },
  {
    referencia: "PU-012", tipo: "pulseras", nombre: "Pulsera esclava lisa",
    descripcion: "Pulsera tipo esclava, superficie lisa, cierre de caja.",
    volumen: 1.1, peso: 10.4, precioBase: 29000, material: "Cera casteable rosa",
    medidas: { largo: 190, ancho: 6 }, tallas: [],
    imagen: "img/pulseras/pu-012.jpg",
  },
  {
    referencia: "PU-017", tipo: "pulseras", nombre: "Pulsera tennis piedras",
    descripcion: "Pulsera línea tenis con base para piedras 3mm en todo el contorno.",
    volumen: 0.98, peso: 9.2, precioBase: 31000, material: "Cera casteable rosa",
    medidas: { largo: 180, ancho: 3.5 }, tallas: [],
    imagen: "img/pulseras/pu-017.jpg",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL. Ejecuta `vercel env pull .env.local --yes` primero.");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  // ON CONFLICT DO NOTHING: el catálogo ya se administra desde /admin, así que
  // volver a correr este script nunca debe pisar datos reales (nombre, precio,
  // imágenes...) que el admin ya haya editado — solo crea lo que falte.
  for (const p of PRODUCTOS) {
    await sql`
      INSERT INTO productos (referencia, tipo, nombre, descripcion, volumen, peso, precio_base, material, medidas, tallas, imagenes)
      VALUES (${p.referencia}, ${p.tipo}, ${p.nombre}, ${p.descripcion}, ${p.volumen}, ${p.peso}, ${p.precioBase}, ${p.material}, ${JSON.stringify(p.medidas)}, ${JSON.stringify(p.tallas)}, '[]')
      ON CONFLICT (referencia) DO NOTHING
    `;
    console.log("OK:", p.referencia);
  }

  console.log(`Sembrados ${PRODUCTOS.length} productos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
