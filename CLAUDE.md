# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Public catalog + storefront for Dinar 3D Wax (wax-cast jewelry models for jewelers), plus its admin panel. Static multi-page site (no framework, no build step) backed by Vercel Serverless Functions, Neon Postgres, and Vercel Blob. See `README.md` for the product/business-flow writeup (payment flow, admin panel walkthrough, pending-launch checklist) — **but treat its "Estructura" file listing as outdated**: it still describes an earlier `api/lib/*` and per-resource `api/admin/productos/[referencia].js`-style layout that no longer exists. The real structure is below.

## Commands

```bash
npm install
vercel dev                        # serves static pages + /api functions together, http://localhost:3000
vercel env pull .env.local --yes  # sync local env vars after changing them in Vercel
npm run db:migrate                # applies scripts/schema.sql (idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
npm run icons:generate            # regenerates PWA icons (scripts/generate-icons.mjs, needs `sharp`) from img/logo-splash.png
node --check path/to/file.js      # no test suite exists; this is the syntax-check used throughout this repo's history
```

No bundler, no linter, no test runner. Verification in practice means: run `vercel dev`, hit the real endpoints/pages with `curl` or a Playwright script, and check the browser console — see any recent commit for the pattern (spin up `vercel dev` on a free port, drive it with Playwright, kill it when done).

Deploying: `vercel deploy` for a preview, `vercel --prod` for production. **Always confirm with the user before running a production deploy or a DB migration against the real database** — this project has exactly one Postgres instance and no staging environment.

## Architecture

### Serverless functions are consolidated, on purpose

Vercel's Hobby plan caps a project at 12 Serverless Functions per deployment. This repo has real traffic across many logical endpoints, so **all `/admin/*` API routes live in the single file `api/admin/[seccion].js`**, dispatching on `req.query.seccion` (`login`, `logout`, `configuracion`, `productos`, `pedidos`, `trabajadores`, `materiales`, `pagos`, `borrar-imagen`, `upload-token`). A resource's id goes in the query string (`?referencia=`, `?id=`), never as an extra path segment — an earlier attempt at a `[...route].js` catch-all did not reliably route multi-segment paths in production on this "Other framework" Vercel project (confirmed in production, not just `vercel dev`), which is why this flatter shape won.

**When adding a new admin feature, add a new `case` to the switch in `api/admin/[seccion].js` and a new `manejarX` function in the same file — do not create a new file under `api/admin/`.** The public (non-admin) endpoints (`api/productos.js`, `api/configuracion.js`, `api/crear-pedido.js`, `api/subir-comprobante.js`, `api/verificar-pago.js`) stay as separate files; only the admin surface is consolidated. Check `find api -name "*.js" | wc -l` against the 12-function cap before adding a genuinely new top-level file.

All DB/Blob access goes through `lib/*.js` at the repo root (not `api/lib/`, despite what the README says): `db.js` (lazy Neon client), `productos.js`, `pedidos.js`, `configuracion.js`, `trabajadores.js`, `materiales.js`, `pagos.js`, `adminAuth.js` (signed-cookie session, see `requiereAdmin()`), `blob.js`, `validarProducto.js`, and `produccion.js` (see below).

### Auth model

Single-admin, password + HMAC-signed cookie (`lib/adminAuth.js`), 12h expiry, no server-side revocation list — logging out just clears the client cookie. This is intentional for a single trusted owner; don't "fix" it into a multi-user system without being asked. Every protected handler starts with `if (!requiereAdmin(req, res)) return;`.

### Images and STL files

Uploaded directly from the browser to Vercel Blob via `@vercel/blob/client` (bypasses the 4.5MB Vercel Function body-size limit) — the server only hands out an upload token (`upload-token` case in the admin router, `onBeforeGenerateToken` branches on a `contexto: "stl"` client payload for the 200MB STL allowance vs. 20MB for images). Deleting a product or replacing its STL/images cleans up the old Blob files (`esUrlDeNuestroBlob()` in `lib/blob.js` guards against deleting a URL that isn't actually ours). `producto.modeloStl` is the one field that is both the public 3D preview source (`js/visor-stl.js`) *and* the exact file forwarded to the workshop for fabrication — never swap in a simplified/preview-only mesh here without adding a separate field for it.

### Cross-project integration: sends approved orders to `dinar-3dwax`

`lib/produccion.js` (`enviarAProduccion`, called from the admin router when a pedido is marked `aprobado`) POSTs to a sibling project's `/api/pedidos-externos` with a shared secret (`DINAR3DWAX_API_URL`, `CATALOGO_INTEGRACION_SECRET`). One OT (work order) is created **per cart line, not per unit** — a quantity-2 line becomes one OT with `cantidad: 2`, not two OTs. It sends `pesoCera` (not the "Oro 18k"-equivalent `peso`), the product's `materialTipo`, cover photo, and the STL URL as-is. The call is idempotent on the receiving side keyed by `origenCatalogoId` (`${pedidoId}#${itemIndex}`), so retrying from this side is safe.

### Product weight fields (easy to mix up)

A product has two distinct weights: `pesoCera` (actual grams of the printed wax piece) and `peso` (the equivalent once cast in `materialTipo`, usually "Oro 18k" — this is what the catalog's weight filter and "Peso material" use). The calculator/pricing formula (`lib/configuracion.js`, editable live from `/admin/configuracion.html`) is: `pesoCera = trunc((pesoOro18k / divisorPesoOro18k) * 100) / 100`, then `precio = pesoCera * precioPorGramoCera`. Server re-derives this from the DB on every order; never trust a price the browser sends.

### The public catalog's redesign lives in one CSS scope

`index.html`'s visual redesign (gold/cream palette, rounded cards, the hero/comparison/specs-FAQ sections) is implemented by overriding the site's existing CSS custom properties (`--dorado`, `--crema`, `--radio`, etc.) inside `body.pagina-catalogo { ... }` in `css/estilos.css`, rather than touching `:root`. Every other page (`carrito.html`, `checkout.html`, `producto.html`, admin) keeps the original palette because they never carry that body class. **If asked to restyle another page, follow the same pattern** (scope new variable values under that page's own body class) instead of editing `:root` — editing `:root` directly would also reskin every other page, including admin.

### PWA layer (public pages only, not `/admin`)

`manifest.webmanifest`, `sw.js`, `offline.html`, and `js/registro-sw.js` (registration skipped on `localhost`/`127.0.0.1` on purpose — see comment in that file before "fixing" it) cover the 6 public pages. `sw.js` cache-firsts static assets/icons only; it must never cache `/api/*` or any `.html` page — that rule is load-bearing for data freshness (prices, stock) and is spelled out in `sw.js`'s own header comment. Icons are generated, not hand-drawn — see `scripts/generate-icons.mjs` (crops the monogram out of `img/logo-splash.png`; re-run `npm run icons:generate` if the logo changes, and look at the output PNGs before trusting them, `sharp`'s `.composite()` silently replaces rather than layers if you call it twice).

### Admin panel: adding a new section

1. Create the page copying `admin/productos.html`'s `<div class="admin-layout">` shell, ending its script with `renderAdminSidebar("id-de-la-seccion")`.
2. Add it to `SECCIONES_ADMIN` in `admin/js/layout.js` — every admin page picks up the new sidebar entry automatically.
3. Add the API surface as a new `case`/`manejarX` in `api/admin/[seccion].js` (see above), guarded by `requiereAdmin`.
4. Add the table to `scripts/schema.sql` as `CREATE TABLE IF NOT EXISTS` (+ `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for later changes to it) and run `npm run db:migrate` — after confirming with the user, since it runs against the one real database.
