/**
 * Pruebas antes de subir a producción (`npm test`).
 *
 * Este proyecto tiene UNA sola base de datos Neon (sin staging), así que
 * todo lo de aquí es de SOLO LECTURA: nunca crea, edita ni borra pedidos,
 * productos ni nada. Los POST que se mandan son a propósito inválidos
 * (deben volver 400/401/405 antes de tocar la base).
 *
 * Etapas:
 *  1. Estáticas (sin servidor): sintaxis, que todos los imports resuelvan,
 *     límite de 12 funciones de Vercel Hobby, JSON válidos, archivos
 *     referenciados por los HTML y precargados por sw.js que existan.
 *  2. API contra un servidor: `vercel dev` en un puerto libre (por defecto)
 *     o una URL ya desplegada con --url=https://... (p. ej. un preview).
 *  3. Navegador (Playwright, escritorio y celular): páginas públicas y del
 *     admin sin errores de JS, sin respuestas 5xx, catálogo con tarjetas,
 *     sin scroll horizontal en celular, carrito que muestra lo guardado.
 *
 * Opciones: --url=<base> (no levanta vercel dev), --solo-estaticas,
 *           --sin-navegador.
 * Sale con código 1 si alguna prueba falla (los avisos no cuentan).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opcion = (nombre) => args.find((a) => a.startsWith(`--${nombre}`));
const URL_EXTERNA = opcion("url")?.split("=")[1]?.replace(/\/$/, "");
const SOLO_ESTATICAS = Boolean(opcion("solo-estaticas"));
const SIN_NAVEGADOR = Boolean(opcion("sin-navegador"));

// Los deploys de Vercel tienen Deployment Protection: con --url= se manda
// el token OIDC local (de .env.local, `vercel env pull` lo renueva) en la
// cabecera de Trusted Sources, y solo al origen probado, nunca a terceros.
const CABECERAS_PROTECCION =
  URL_EXTERNA && process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};

const LIMITE_FUNCIONES = 12;
const PAGINAS_PUBLICAS = ["/", "/carrito.html", "/checkout.html", "/personalizados.html", "/offline.html"];
const SECCIONES_ADMIN_GET = ["configuracion", "productos", "pedidos", "trabajadores", "materiales", "pagos", "solicitudes"];

const resultados = { ok: 0, fallas: [], avisos: [] };

function ok(mensaje) {
  resultados.ok++;
  console.log(`  ✔ ${mensaje}`);
}
function falla(mensaje) {
  resultados.fallas.push(mensaje);
  console.log(`  ✘ ${mensaje}`);
}
function aviso(mensaje) {
  resultados.avisos.push(mensaje);
  console.log(`  ⚠ ${mensaje}`);
}
function comprobar(condicion, mensaje, detalle = "") {
  if (condicion) ok(mensaje);
  else falla(detalle ? `${mensaje} — ${detalle}` : mensaje);
}

function listarArchivos(dir, filtro) {
  const absoluto = path.join(RAIZ, dir);
  if (!existsSync(absoluto)) return [];
  return readdirSync(absoluto, { recursive: true })
    .map((f) => path.join(dir, f))
    .filter((f) => statSync(path.join(RAIZ, f)).isFile() && filtro(f));
}

// ---------------------------------------------------------------- 1. Estáticas

async function pruebasEstaticas() {
  console.log("\n1. Pruebas estáticas");

  const archivosJs = [
    ...["api", "lib", "js", "admin/js", "scripts"].flatMap((d) => listarArchivos(d, (f) => /\.(m?js)$/.test(f))),
    "sw.js",
  ];
  const conErrorDeSintaxis = archivosJs.filter((f) => {
    const r = spawnSync(process.execPath, ["--check", f], { cwd: RAIZ, encoding: "utf8" });
    if (r.status !== 0) console.log(r.stderr.trim());
    return r.status !== 0;
  });
  comprobar(conErrorDeSintaxis.length === 0, `Sintaxis de ${archivosJs.length} archivos JS`, conErrorDeSintaxis.join(", "));

  // Importar cada función de /api detecta lo que `node --check` no ve: un
  // import de un archivo o export que no existe (rompe la función entera
  // en producción). lib/db.js es perezoso, así que esto no abre conexiones.
  const funciones = listarArchivos("api", (f) => f.endsWith(".js") && !path.basename(f).startsWith("_"));
  for (const f of funciones) {
    try {
      const modulo = await import(pathToFileURL(path.join(RAIZ, f)).href);
      comprobar(typeof modulo.default === "function", `${f} carga y exporta un handler`);
    } catch (err) {
      falla(`${f} no carga — ${err.message}`);
    }
  }
  comprobar(
    funciones.length <= LIMITE_FUNCIONES,
    `Funciones serverless: ${funciones.length}/${LIMITE_FUNCIONES} (límite Vercel Hobby)`,
    "las rutas nuevas de admin van como `case` en api/admin/[seccion].js"
  );

  for (const f of ["vercel.json", "manifest.webmanifest", "package.json"]) {
    try {
      JSON.parse(readFileSync(path.join(RAIZ, f), "utf8"));
      ok(`${f} es JSON válido`);
    } catch (err) {
      falla(`${f} no es JSON válido — ${err.message}`);
    }
  }

  // Archivos locales referenciados por los HTML (src/href) que no existen.
  const paginas = [...listarArchivos(".", (f) => !f.includes(path.sep) && f.endsWith(".html")), ...listarArchivos("admin", (f) => f.endsWith(".html"))];
  const rotos = [];
  for (const pagina of paginas) {
    const html = readFileSync(path.join(RAIZ, pagina), "utf8");
    for (const [, ref] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      if (/^(https?:|\/\/|mailto:|tel:|data:|#|javascript:)/.test(ref) || ref.includes("${")) continue;
      const limpio = ref.split(/[?#]/)[0];
      if (!limpio || limpio.startsWith("/api/") || !path.extname(limpio)) continue;
      const destino = limpio.startsWith("/") ? path.join(RAIZ, limpio) : path.join(RAIZ, path.dirname(pagina), limpio);
      if (!existsSync(destino)) rotos.push(`${pagina} → ${ref}`);
    }
  }
  comprobar(rotos.length === 0, `Referencias locales de ${paginas.length} páginas HTML`, rotos.join(", "));

  // Si un archivo de la precarga de sw.js no existe, la instalación del
  // service worker falla entera (cache.addAll es todo o nada).
  const sw = readFileSync(path.join(RAIZ, "sw.js"), "utf8");
  const precarga = [...(sw.match(/PRECARGA_ESTATICOS\s*=\s*\[([\s\S]*?)\]/)?.[1] || "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const faltantes = [...precarga, "/offline.html"].filter((p) => !existsSync(path.join(RAIZ, p)));
  comprobar(faltantes.length === 0, `Precarga de sw.js (${precarga.length} archivos) existe`, faltantes.join(", "));
  comprobar(
    /startsWith\("\/api\/"\)\)\s*return/.test(sw) && /startsWith\("\/admin\/"\)\)\s*return/.test(sw),
    "sw.js sigue excluyendo /api/* y /admin/* de la caché"
  );

  const estado = spawnSync("git", ["status", "--porcelain"], { cwd: RAIZ, encoding: "utf8" }).stdout.trim();
  if (estado) aviso(`Hay cambios sin commit (${estado.split("\n").length} archivos): se probará lo que hay en disco, no lo que hay en git`);
}

// ---------------------------------------------------------------- 2. API

function puertoLibre() {
  return new Promise((resolve) => {
    const servidor = net.createServer().listen(0, () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

async function levantarVercelDev() {
  const puerto = await puertoLibre();
  const base = `http://localhost:${puerto}`;
  console.log(`\n   Levantando vercel dev en ${base} ...`);
  const proceso = spawn("vercel", ["dev", "--listen", String(puerto), "--yes"], {
    cwd: RAIZ,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let salida = "";
  proceso.stdout.on("data", (d) => (salida += d));
  proceso.stderr.on("data", (d) => (salida += d));

  const limite = Date.now() + 120_000;
  while (Date.now() < limite) {
    if (proceso.exitCode !== null) throw new Error(`vercel dev terminó antes de arrancar:\n${salida}`);
    try {
      const r = await fetch(`${base}/api/configuracion`);
      if (r.status < 500) return { base, detener: () => process.kill(-proceso.pid, "SIGTERM") };
    } catch {
      // todavía no escucha
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.kill(-proceso.pid, "SIGTERM");
  throw new Error(`vercel dev no respondió en 120 s:\n${salida}`);
}

async function pedir(base, ruta, opciones = {}) {
  const r = await fetch(base + ruta, {
    redirect: "manual",
    ...opciones,
    headers: { ...CABECERAS_PROTECCION, ...opciones.headers },
  });
  let cuerpo = null;
  const texto = await r.text();
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    cuerpo = texto;
  }
  return { status: r.status, headers: r.headers, cuerpo };
}

const json = (cuerpo) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });

async function pruebasApi(base) {
  console.log("\n2. Pruebas de API (solo lectura)");
  const contexto = { productos: [], cookie: null };

  const sonda = await pedir(base, "/");
  if (sonda.status === 401 || sonda.status === 403 || (sonda.status >= 300 && sonda.status < 400 && /vercel\.com\/(login|sso)/.test(sonda.headers.get("location") || ""))) {
    throw new Error(
      `${base} está detrás de Deployment Protection (status ${sonda.status}). ` +
        "Corre `vercel env pull .env.local --yes` para renovar VERCEL_OIDC_TOKEN y vuelve a intentar."
    );
  }

  for (const pagina of PAGINAS_PUBLICAS) {
    const r = await pedir(base, pagina);
    comprobar(r.status === 200 && /text\/html/.test(r.headers.get("content-type")), `GET ${pagina} → 200 HTML`, `status ${r.status}`);
  }

  const inicio = await pedir(base, "/");
  comprobar(
    inicio.headers.get("x-frame-options") === "DENY" && inicio.headers.get("x-content-type-options") === "nosniff",
    "Cabeceras de seguridad de vercel.json presentes"
  );
  // `vercel dev` no aplica esta cabecera de vercel.json (producción sí):
  // en local solo avisa, contra una URL desplegada sí es falla.
  const sw = await pedir(base, "/sw.js");
  if (/no-cache/.test(sw.headers.get("cache-control") || "")) ok("sw.js se sirve sin caché");
  else if (URL_EXTERNA) falla("sw.js se sirve sin caché — revisar headers de vercel.json");
  else aviso("sw.js sin `no-cache` en vercel dev (normal en local; se verifica de verdad con --url=)");

  const productos = await pedir(base, "/api/productos");
  comprobar(productos.status === 200 && Array.isArray(productos.cuerpo), "GET /api/productos → lista", `status ${productos.status}`);
  if (Array.isArray(productos.cuerpo)) {
    contexto.productos = productos.cuerpo;
    if (productos.cuerpo.length === 0) aviso("El catálogo está vacío: las pruebas de ficha y carrito se saltan");
    const malos = productos.cuerpo.filter((p) => !p.referencia || !(Number(p.precioBase) > 0) || !p.nombre);
    comprobar(malos.length === 0, `${productos.cuerpo.length} productos con referencia, nombre y precio > 0`, malos.map((p) => p.referencia || "(sin ref)").join(", "));
  }

  const config = await pedir(base, "/api/configuracion");
  comprobar(
    config.status === 200 && config.cuerpo?.precioPorGramoCera > 0 && config.cuerpo?.divisorPesoOro18k > 0,
    "GET /api/configuracion → precio por gramo y divisor > 0",
    `status ${config.status}`
  );

  comprobar((await pedir(base, "/api/productos", { method: "POST" })).status === 405, "POST /api/productos → 405");
  comprobar((await pedir(base, "/api/verificar-pago")).status === 400, "GET /api/verificar-pago sin orden → 400");
  comprobar((await pedir(base, "/api/crear-pedido", json({}))).status === 400, "POST /api/crear-pedido vacío → 400 (no crea nada)");
  comprobar(
    (await pedir(base, "/api/crear-pedido", json({ cliente: { nombre: "<script>", cedula: "1", whatsapp: "1", ciudad: "x", direccion: "x" }, items: [] }))).status === 400,
    "POST /api/crear-pedido con HTML en el nombre → 400"
  );
  comprobar((await pedir(base, "/api/solicitudes-diseno", json({}))).status === 400, "POST /api/solicitudes-diseno vacío → 400 (no crea nada)");

  for (const seccion of SECCIONES_ADMIN_GET) {
    const r = await pedir(base, `/api/admin/${seccion}`);
    comprobar(r.status === 401, `GET /api/admin/${seccion} sin sesión → 401`, `status ${r.status}`);
  }
  comprobar((await pedir(base, "/api/admin/no-existe")).status === 404, "GET /api/admin/no-existe → 404");
  comprobar((await pedir(base, "/api/admin/login", json({ password: "incorrecta-de-prueba" }))).status === 401, "Login con contraseña incorrecta → 401");
  comprobar(
    (await pedir(base, "/api/admin/pedidos", { headers: { Cookie: "admin_session=falso.firma" } })).status === 401,
    "Cookie de sesión falsificada → 401"
  );

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    aviso("ADMIN_PASSWORD no está en el entorno (.env.local): se saltan las pruebas con sesión de admin");
    return contexto;
  }
  const login = await pedir(base, "/api/admin/login", json({ password }));
  const setCookie = login.headers.get("set-cookie") || "";
  comprobar(login.status === 200 && setCookie.includes("admin_session="), "Login de admin con la contraseña real → 200 + cookie", `status ${login.status}`);
  contexto.cookie = setCookie.split(";")[0];
  if (login.status !== 200) return contexto;

  for (const seccion of SECCIONES_ADMIN_GET) {
    const r = await pedir(base, `/api/admin/${seccion}`, { headers: { Cookie: contexto.cookie } });
    comprobar(r.status === 200 && typeof r.cuerpo === "object", `GET /api/admin/${seccion} con sesión → 200`, `status ${r.status} ${JSON.stringify(r.cuerpo).slice(0, 120)}`);
  }
  const idInvalido = await pedir(base, "/api/admin/pagos?trabajadorId=null", { headers: { Cookie: contexto.cookie } });
  comprobar(idInvalido.status === 400, "GET /api/admin/pagos?trabajadorId=null → 400 (no 500)", `status ${idInvalido.status}`);

  // Depende de otro proyecto (dinar-3dwax): si falla es aviso, no bloquea.
  const taller = await pedir(base, "/api/admin/estadisticas-taller", { headers: { Cookie: contexto.cookie } });
  if (taller.status === 200) ok("GET /api/admin/estadisticas-taller → 200 (integración con el taller viva)");
  else aviso(`Estadísticas del taller respondieron ${taller.status}: revisar DINAR3DWAX_API_URL / el proyecto dinar-3dwax`);

  return contexto;
}

// ---------------------------------------------------------------- 3. Navegador

async function pruebasNavegador(base, contexto) {
  console.log("\n3. Pruebas en navegador (Playwright)");
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    falla("Playwright no está instalado: `npm install` y `npx playwright install chromium`");
    return;
  }
  const navegador = await chromium.launch();
  const origen = new URL(base).origin;
  const nuevoContexto = async (opciones) => {
    const ctx = await navegador.newContext(opciones);
    if (Object.keys(CABECERAS_PROTECCION).length) {
      await ctx.route(`${origen}/**`, (ruta) => ruta.continue({ headers: { ...ruta.request().headers(), ...CABECERAS_PROTECCION } }));
    }
    return ctx;
  };

  async function revisarPagina(pagina, ruta, etiqueta, extra) {
    const errores = [];
    const alError = (e) => errores.push(`error JS: ${e.message}`);
    const alConsola = (m) => m.type() === "error" && errores.push(`consola: ${m.text()}`);
    const alResponder = (r) => r.url().startsWith(origen) && r.status() >= 500 && errores.push(`${r.status()} ${r.url().replace(origen, "")}`);
    pagina.on("pageerror", alError);
    pagina.on("console", alConsola);
    pagina.on("response", alResponder);
    try {
      await pagina.goto(base + ruta, { waitUntil: "networkidle", timeout: 45_000 });
      if (extra) await extra(pagina, errores);
    } catch (err) {
      errores.push(err.message.split("\n")[0]);
    }
    pagina.off("pageerror", alError);
    pagina.off("console", alConsola);
    pagina.off("response", alResponder);
    comprobar(errores.length === 0, `${etiqueta} ${ruta}`, [...new Set(errores)].slice(0, 5).join(" | "));
  }

  const sinScrollHorizontal = async (pagina, errores) => {
    const ancho = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ancho > 1) errores.push(`scroll horizontal de ${ancho}px en celular`);
  };

  const primerProducto = contexto.productos[0];
  const dispositivos = [
    { nombre: "[escritorio]", opciones: { viewport: { width: 1280, height: 800 } } },
    { nombre: "[celular]", opciones: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ];

  for (const { nombre, opciones } of dispositivos) {
    const ctx = await nuevoContexto(opciones);
    const pagina = await ctx.newPage();
    const esCelular = Boolean(opciones.isMobile);

    await revisarPagina(pagina, "/", nombre, async (p, errores) => {
      if (contexto.productos.length > 0) {
        await p.waitForSelector(".tarjeta-producto", { timeout: 15_000 }).catch(() => errores.push("el catálogo no mostró tarjetas de producto"));
      }
      if (esCelular) await sinScrollHorizontal(p, errores);
    });

    if (primerProducto) {
      await revisarPagina(pagina, `/producto.html?ref=${encodeURIComponent(primerProducto.referencia)}`, nombre, async (p, errores) => {
        const ref = await p.textContent("#ficha-ref").catch(() => "");
        if (!ref?.includes(primerProducto.referencia)) errores.push("la ficha no muestra la referencia del producto");
        if (esCelular) await sinScrollHorizontal(p, errores);
      });

      // Carrito: se guarda una línea en localStorage (como lo hace la ficha)
      // y se comprueba que carrito.html la muestre. No crea ningún pedido.
      await pagina.evaluate((ref) => localStorage.setItem("dinar_carrito", JSON.stringify([{ referencia: ref, cantidad: 2, talla: "" }])), primerProducto.referencia);
      await revisarPagina(pagina, "/carrito.html", nombre, async (p, errores) => {
        const texto = await p.textContent("body");
        if (!texto.includes(primerProducto.referencia) && !texto.includes(primerProducto.nombre)) errores.push("el carrito no muestra el producto guardado");
        if (esCelular) await sinScrollHorizontal(p, errores);
      });
      await revisarPagina(pagina, "/checkout.html", nombre, esCelular ? sinScrollHorizontal : undefined);
      await pagina.evaluate(() => localStorage.removeItem("dinar_carrito"));
    }

    for (const ruta of ["/personalizados.html", "/producto.html?ref=NO-EXISTE-123"]) {
      await revisarPagina(pagina, ruta, nombre, esCelular ? sinScrollHorizontal : undefined);
    }
    await ctx.close();
  }

  if (!process.env.ADMIN_PASSWORD) return;

  const ctx = await nuevoContexto({ viewport: { width: 1280, height: 800 } });
  const pagina = await ctx.newPage();
  await revisarPagina(pagina, "/admin/login.html", "[admin]", async (p, errores) => {
    await p.fill("#password", process.env.ADMIN_PASSWORD);
    await Promise.all([p.waitForURL((u) => !u.pathname.endsWith("/login.html"), { timeout: 15_000 }), p.press("#password", "Enter")]).catch(() =>
      errores.push("el login del panel no redirigió")
    );
  });
  const paginasAdmin = listarArchivos("admin", (f) => f.endsWith(".html") && !f.endsWith("login.html")).map((f) => "/" + f.split(path.sep).join("/"));
  for (const ruta of paginasAdmin) {
    // Las páginas de detalle (producto, colaborador, solicitud, comprobante)
    // sin ?id= muestran su propio aviso de "no encontrado"; igual no deben
    // romper el JS ni mandar al login.
    await revisarPagina(pagina, ruta, "[admin]", async (p, errores) => {
      if (new URL(p.url()).pathname.endsWith("/login.html")) errores.push("redirigió al login con sesión válida");
    });
  }
  await ctx.close();
  await navegador.close();
}

// ---------------------------------------------------------------- Principal

let detener = () => {};
try {
  await pruebasEstaticas();
  if (!SOLO_ESTATICAS) {
    let base = URL_EXTERNA;
    if (!base) ({ base, detener } = await levantarVercelDev());
    else console.log(`\n   Probando contra ${base}`);
    const contexto = await pruebasApi(base);
    if (!SIN_NAVEGADOR) await pruebasNavegador(base, contexto);
  }
} catch (err) {
  falla(`Error inesperado del script de pruebas — ${err.message}`);
} finally {
  detener();
}

console.log(`\nResultado: ${resultados.ok} OK, ${resultados.fallas.length} fallas, ${resultados.avisos.length} avisos`);
if (resultados.fallas.length) {
  console.log("\nFALLAS (no subir a producción hasta corregirlas):");
  for (const f of resultados.fallas) console.log(`  ✘ ${f}`);
}
if (resultados.avisos.length) {
  console.log("\nAvisos:");
  for (const a of resultados.avisos) console.log(`  ⚠ ${a}`);
}
process.exit(resultados.fallas.length ? 1 : 0);
