# Catálogo Dinar 3D Wax

Catálogo de modelos en cera casteable para joyeros, con carrito, calculadora de
servicio, checkout por transferencia bancaria (con comprobante y verificación
manual) y un panel de administración para gestionar productos, pedidos y
configuración sin tocar código. Pensado para desplegarse en un subdominio
(p. ej. `catalogo.dinar3dwax.com`) sobre Vercel.

## Stack

- **Frontend:** HTML + CSS + JavaScript sin build step (páginas estáticas en la raíz).
- **Backend:** funciones serverless de Node.js en `/api` (Vercel Functions).
- **Base de datos:** Postgres (Neon, vía Vercel Marketplace) — tablas `productos`, `pedidos` y `configuracion`.
- **Imágenes, archivos STL y comprobantes de pago:** Vercel Blob (almacenamiento público de archivos).
- **Visor 3D:** Three.js (vía CDN + import map, sin build step) para previsualizar el STL en la ficha de producto.
- **Pagos:** transferencia bancaria manual (Bancolombia) — el cliente sube su comprobante en el checkout y el admin verifica y aprueba el pedido desde el panel. No usa pasarela de pagos.
- **Panel admin:** login simple (contraseña única) + sesión por cookie firmada — pensado para un solo usuario (el dueño del negocio), sin registro público.

Proyecto de Vercel ya creado y vinculado: `delasoft/catalogo-dinar3dwx`.
Base de datos Neon ya aprovisionada y migrada. Store de Vercel Blob ya creado
(`catalogo-dinar3dwx-imagenes`, acceso público).

## Estructura

```
index.html          catálogo principal (filtros, búsqueda por referencia)
producto.html        ficha de producto + selector de talla/cantidad
calculadora.html      calculadora de servicio (piezas sin referencia)
carrito.html          carrito (localStorage)
checkout.html         datos de entrega + datos bancarios + subida de comprobante
confirmacion.html     estado del pedido + botón de WhatsApp

admin/login.html      acceso al panel
admin/index.html       dashboard: resumen del catálogo/pedidos + accesos a cada sección
admin/productos.html    listado de productos (editar / eliminar / nuevo)
admin/producto.html     alta y edición de un producto
admin/pedidos.html       listado de pedidos: cliente, ítems, comprobante y estado de pago (aprobar/rechazar manualmente)
admin/configuracion.html  WhatsApp, fórmula de la calculadora y cuenta bancaria
admin/js/admin.js        sesión, logout, utilidades compartidas del panel
admin/js/layout.js        menú lateral compartido por todas las páginas del panel

css/estilos.css        estilos (incluye la sección admin al final del archivo)
js/productos.js         config del sitio (carga async desde /api/configuracion) + catálogo (desde /api/productos) + fórmula de la calculadora
js/carrito.js            carrito en localStorage
js/catalogo.js           filtros, búsqueda, render de tarjetas
js/producto.js            ficha de producto (muestra el visor 3D si el producto tiene modeloStl)
js/visor-stl.js            visor 3D interactivo (Three.js) que carga el archivo STL en la ficha
js/calculadora.js         calculadora de servicio
js/checkout.js             valida datos, sube el comprobante y llama a /api/crear-pedido
js/confirmacion.js          consulta /api/verificar-pago y arma el link de WhatsApp

api/productos.js              GET público — catálogo completo (lee la tabla `productos`)
api/configuracion.js           GET público — WhatsApp, fórmula de la calculadora y cuenta bancaria (lee la tabla `configuracion`)
api/subir-comprobante.js        POST público — sube el comprobante de transferencia a Vercel Blob (sin login: el cliente aún no tiene pedido creado)
api/crear-pedido.js             POST público — revalida precios, crea el pedido (estado `pendiente`) con el comprobante adjunto
api/verificar-pago.js            GET ?orden=ID — estado público de un pedido (lo usa confirmacion.html)

api/admin/login.js              POST — inicia sesión de administrador
api/admin/logout.js              POST — cierra sesión
api/admin/session.js              GET — indica si hay sesión activa
api/admin/productos/index.js       GET (listar) / POST (crear) — protegidos
api/admin/productos/[referencia].js GET / PUT / DELETE de un producto — protegidos (al eliminar, borra también sus imágenes y STL del storage)
api/admin/subir-imagen.js           POST — sube una imagen a Vercel Blob y devuelve su URL pública — protegido
api/admin/subir-stl.js               POST — sube un archivo .stl a Vercel Blob y devuelve su URL pública — protegido
api/admin/borrar-imagen.js           POST — borra una imagen del storage cuando se quita de la galería — protegido
api/admin/pedidos/index.js           GET — lista todos los pedidos (con datos del cliente y comprobante) — protegido
api/admin/pedidos/[id].js             PUT — cambia el estado de un pedido (aprobado/pendiente/rechazado) — protegido
api/admin/configuracion.js           GET / PUT — leer y actualizar WhatsApp, fórmula de la calculadora y cuenta bancaria — protegido

api/lib/productos.js       acceso a la tabla `productos` (única fuente de verdad de precios)
api/lib/pedidos.js          acceso a la tabla `pedidos`
api/lib/configuracion.js     acceso a la tabla `configuracion` (fila única) + calcularPrecioServicio()
api/lib/db.js                 cliente Neon
api/lib/adminAuth.js            firma/verifica la cookie de sesión del panel
api/lib/validarProducto.js       valida el payload de un producto
api/lib/blob.js                   helper para reconocer URLs propias de Vercel Blob

scripts/schema.sql              esquema de la base de datos (tablas `pedidos`, `productos`, `configuracion`)
scripts/migrar-db.js             aplica scripts/schema.sql contra DATABASE_URL
scripts/sembrar-productos.js      siembra/actualiza el catálogo inicial (solo referencia, idempotente)

img/<categoria>/           carpeta heredada de la versión inicial; ya no es necesaria, las imágenes nuevas se suben a Vercel Blob desde /admin
pdf/guias/                  PDFs de guía de tallas/medidas/STL enlazados desde index.html
```

## Variables de entorno

| Variable | Origen | Notas |
|---|---|---|
| `DATABASE_URL` | Automática (integración Neon) | ya está en `.env.local` y en Vercel |
| `ADMIN_PASSWORD` | Ya configurada (temporal) | contraseña del panel `/admin` — **cámbiala antes de dársela al cliente** |
| `ADMIN_SESSION_SECRET` | Ya configurada | clave interna para firmar la cookie de sesión, no la comparte nadie |

Configúralas/actualízalas con:

```bash
# para cambiar la contraseña del panel:
vercel env rm ADMIN_PASSWORD production
vercel env add ADMIN_PASSWORD production
```

Y sincroniza las variables locales cuando cambien:

```bash
vercel env pull .env.local --yes
```

## Desarrollo local

```bash
npm install
vercel dev
```

Esto sirve las páginas estáticas y las funciones de `/api` juntas en `http://localhost:3000`.

## Base de datos

El esquema ya se aplicó una vez. Para volver a aplicarlo (es idempotente, usa
`CREATE TABLE IF NOT EXISTS`):

```bash
npm run db:migrate
```

## Cómo se paga: transferencia bancaria + comprobante

No se usa ninguna pasarela de pagos (Mercado Pago, etc.). El flujo es:

1. En `checkout.html`, el cliente ve los datos de la cuenta bancaria (definidos en `/admin/configuracion.html`) y el total a transferir.
2. Hace la transferencia por su cuenta y sube el comprobante (JPG, PNG o PDF, máx. 8 MB) — se guarda en Vercel Blob vía `POST /api/subir-comprobante` (endpoint público: el cliente todavía no tiene una sesión ni un pedido creado en ese punto).
3. Al confirmar, `POST /api/crear-pedido` revalida los precios contra la base de datos (igual que antes, nunca confía en lo que manda el navegador) y crea el pedido con estado **`pendiente`** y el comprobante adjunto.
4. El cliente cae en `confirmacion.html`, que explica que el pago está en verificación y ofrece un botón para enviar el comprobante por WhatsApp también.
5. El admin revisa el pedido en `/admin/pedidos.html` (ve el comprobante y todos los datos) y lo marca manualmente como **aprobado** o **rechazado** una vez confirma que la plata llegó. `confirmacion.html` refleja ese cambio si el cliente vuelve a esa página.

No hay verificación bancaria automática (no existe integración con la API de Bancolombia): la aprobación siempre es una acción manual del admin.

## Panel de administración

`http://localhost:3000/admin/login.html` (o `https://tu-dominio/admin/login.html`
en producción). Tras iniciar sesión con `ADMIN_PASSWORD` se entra al **dashboard**
(`/admin/index.html`): un resumen del catálogo y de los pedidos (totales,
categorías, cuántos productos tienen imágenes/STL, pedidos pendientes) con
accesos a cada sección desde el menú lateral: **Productos**, **Pedidos** y
**Configuración**. El panel crece agregando secciones nuevas al menú
(`admin/js/layout.js`) sin tener que reorganizar lo que ya existe.

### Configuración (`/admin/configuracion.html`)

Se puede cambiar, sin tocar código:

- El número de WhatsApp al que llega el botón de confirmación de cada pedido.
- Los dos valores de la fórmula de la calculadora de servicio: el divisor
  (peso oro 18k ÷ divisor = peso en cera) y el precio por gramo en cera. La
  página muestra una vista previa en vivo con el resultado para 10 g, así se
  puede verificar el cálculo antes de guardar.
- **Los datos de la cuenta bancaria** (banco, tipo de cuenta, número, titular,
  documento) que se muestran a los clientes en el checkout. **Están en
  `PENDIENTE DE CONFIGURAR` por defecto — hay que completarlos antes de
  recibir pedidos reales**, si no el cliente no sabrá a qué cuenta transferir.

Estos valores viven en la tabla `configuracion` (fila única, `id = 1`) y se
sirven vía `GET /api/configuracion` — el checkout, la calculadora pública y el
mensaje de WhatsApp de la confirmación los leen de ahí en tiempo real, y el
servidor usa los mismos valores de la fórmula para revalidar el precio de
piezas personalizadas antes de crear el pedido (`api/lib/configuracion.js`).

### Pedidos (`/admin/pedidos.html`)

Listado completo (más reciente primero) con referencia, cliente, fecha, total
y estado de pago. El botón "Ver" expande cada fila con los datos de contacto
y entrega, el detalle de los ítems comprados y el **comprobante de la
transferencia** (miniatura si es imagen, link si es PDF). Ahí mismo se puede
marcar el pedido como **✓ Aprobado**, **✕ Rechazado**, o devolverlo a
pendiente — es la única forma de confirmar un pago, ya que no hay
verificación bancaria automática.

### Productos (`/admin/productos.html`)

- Ver el listado completo (con miniatura de la portada de cada uno), con
  buscador (por referencia, nombre o categoría) y paginación (10/30/100 por página).
- Crear un producto nuevo (referencia, categoría, nombre, descripción,
  material de la cera, peso de la cera, tipo de material (ej. "Oro 18k"),
  peso del material, volumen, precio, imágenes, tallas y hasta 3 medidas).
- Editar o eliminar un producto existente.

Un producto maneja **dos pesos distintos**, a propósito: `pesoCera` (el peso
real de la pieza impresa en cera, en gramos) y `peso` (el peso equivalente
una vez fundida en el material indicado en `materialTipo`, típicamente
"Oro 18k" — este es el que usan los filtros del catálogo y el que se
muestra como "Peso material" en la ficha). La ficha de producto
(`producto.html`) solo muestra: Tipo, Material, Peso cera, Tipo material,
Peso material y Tallas — el volumen y las medidas (diámetro, grosor, etc.)
siguen siendo editables en el panel pero ya no se muestran en la ficha
pública.
- Subir **varias fotos/renders** por producto directo desde el navegador (JPG,
  PNG o WEBP, máx. 8 MB c/u, se pueden elegir varias a la vez) — se guardan en
  Vercel Blob y quedan públicas al instante. La primera imagen de la lista es
  la "portada" (la que se usa en las tarjetas del catálogo y en el carrito);
  desde el panel se puede reordenar (botón ↑) o quitar (✕) cada una.
- Subir el archivo STL del modelo (máx. 20 MB) — también a Vercel Blob.
  Al reemplazar el STL o quitar una imagen de la galería, el archivo anterior
  se borra del storage; lo mismo pasa con todos los archivos de un producto
  si se elimina el producto completo (no se acumulan archivos huérfanos).

El catálogo público (`index.html`, `producto.html`, etc.) lee estos mismos
datos en tiempo real vía `GET /api/productos` — cualquier cambio en el panel
(datos, imágenes o STL) se refleja en el sitio sin necesidad de redeploy. Si
un producto tiene varias imágenes, su ficha (`producto.html`) muestra una
galería con miniaturas para verlas todas. Si tiene un archivo STL cargado,
la ficha muestra un visor 3D interactivo (arrastrar para rotar, rueda del
mouse para hacer zoom) — **a propósito no hay botón de descarga del STL**,
para no facilitar que cualquier visitante se lleve el diseño original. Esto
disuade al usuario normal, pero no es protección total: el archivo sigue
siendo una URL pública de Vercel Blob, así que alguien con conocimientos
técnicos podría encontrarla inspeccionando el tráfico del navegador. Si se
necesita protección más fuerte (URLs firmadas y temporales, marca de agua,
etc.) es un cambio aparte que se puede evaluar más adelante.

**Nota de seguridad:** es un login de un solo usuario con sesión firmada por
cookie (`HttpOnly`, `Secure` en producción, expira a las 12 horas). No hay
lista de revocación server-side: "Salir" borra la cookie del navegador, pero
un token ya emitido sigue siendo válido hasta su expiración natural si alguien
lo copiara antes del logout. Para el uso previsto (un solo administrador de
confianza) es un trade-off razonable; si más adelante se necesitan varios
usuarios o roles, conviene migrar a un proveedor de autenticación (Clerk).

### Cómo agregar una sección nueva al panel

1. Crear la página, copiando la estructura de `admin/productos.html` (el
   `<div class="admin-layout">` con `<aside>` + `<main>`, y al final del
   script `renderAdminSidebar("id-de-la-seccion")`).
2. Agregar la entrada en `SECCIONES_ADMIN` (`admin/js/layout.js`), p. ej.
   `{ id: "reportes", etiqueta: "📊 Reportes", href: "/admin/reportes.html" }`.
   Aparece sola en el menú de todas las páginas del panel.
3. Si corresponde, agregar un acceso real en `admin/index.html`.
4. Si la sección necesita datos protegidos, seguir el patrón de
   `api/admin/productos/*`: `requiereAdmin(req, res)` al inicio del handler.

## Agregar o editar productos

Ya no se edita código: todo el catálogo vive en la tabla `productos` de la
base de datos y se administra desde `/admin`. `scripts/sembrar-productos.js`
solo se usa para la siembra inicial o para restaurar datos de referencia; no
hace falta volver a correrlo en el uso normal.

## Pendiente antes de salir a producción

- [ ] **Completar la cuenta bancaria real en `/admin/configuracion.html`** (banco, tipo de cuenta, número, titular, documento) — hoy tiene datos de ejemplo (`PENDIENTE DE CONFIGURAR`). Sin esto el cliente no puede pagar.
- [ ] Cambiar `ADMIN_PASSWORD` por una contraseña definitiva antes de entregarle el acceso al cliente.
- [ ] Subir los renders reales y los archivos STL de cada producto desde `/admin` (las tarjetas muestran el nombre de la categoría como placeholder si el producto no tiene imagen; sin STL, la ficha simplemente no muestra la sección de vista 3D).
- [ ] Subir los PDFs reales a `pdf/guias/` (`guia-tallas.pdf`, `guia-medidas.pdf`, `especificaciones-stl.pdf`).
- [ ] Configurar el subdominio (`catalogo.dinar3dwax.com`) en el proyecto de Vercel.
- [x] Fórmula de la calculadora ajustada a la del negocio: peso (oro 18k) ÷ divisor (16.5), truncado a 2 decimales, × precio por gramo ($50.000). Ej: 10 g → 0.60 → $30.000. Editable desde `/admin/configuracion.html`.
- [x] Checkout por transferencia bancaria con comprobante + aprobación manual del admin (ver sección arriba).
# catalogo-dinar3dwax
