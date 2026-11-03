---
name: probar-antes-de-produccion
description: Corre la batería de pruebas del catálogo Dinar 3D Wax (estáticas, API y navegador con Playwright) y decide si el código está listo para producción. Usar SIEMPRE antes de `vercel --prod`, antes de hacer push a main si eso despliega, después de cualquier cambio en api/, lib/, js/, admin/ o sw.js, y cuando el usuario pida "probar", "testear", "verificar que todo funcione" o "revisar antes de subir".
---

# Probar antes de producción

Este proyecto tiene **una sola base de datos Neon real y no hay staging**. Las
pruebas son de solo lectura a propósito: nunca crean pedidos, productos,
pagos ni solicitudes. No agregues pruebas que escriban en la base sin
preguntarle antes al usuario.

## 1. Correr las pruebas

```bash
npm test                         # estáticas + vercel dev en puerto libre + API + navegador
npm test -- --solo-estaticas     # rápido, sin servidor (sintaxis, imports, límite de funciones)
npm test -- --sin-navegador      # estáticas + API, sin Playwright
npm test -- --url=https://<preview>.vercel.app   # contra un deploy ya hecho (preview)
```

El script es `scripts/probar.mjs`; carga `.env.local` (necesita
`ADMIN_PASSWORD` para la parte con sesión de admin). Tarda ~1–2 min por
`vercel dev`. Si Playwright no tiene navegador: `npx playwright install chromium`.

Los previews tienen Deployment Protection: con `--url=` el script manda el
`VERCEL_OIDC_TOKEN` de `.env.local` (cabecera de Trusted Sources, solo al
dominio probado). Si dice "está detrás de Deployment Protection", el token
expiró: `vercel env pull .env.local --yes` y repetir. No desactives la
protección. Más detalle en el skill `vercel:access-protected-vercel-deployment`.

## 2. Leer el resultado

- `✘` **falla** → no se sube a producción. Corrige, vuelve a correr `npm test`.
- `⚠` **aviso** → no bloquea, pero repórtalo al usuario (p. ej. cambios sin
  commit, integración con el taller caída, cabecera que `vercel dev` no aplica).
- Código de salida 0 = sin fallas.

No declares "listo" con fallas pendientes ni ocultes un aviso. Muestra al
usuario el resumen final (OK / fallas / avisos).

## 3. Revisión manual que el script no cubre

Antes de desplegar, revisa el diff (`git diff origin/main...`) por esto:

- **CSS/JS cambiados**: si se modificó `css/*.css` o `js/*.js`, sube el
  `?v=N` en *todas* las páginas que lo cargan (si no, celulares con el
  service worker viejo mezclan HTML nuevo con CSS/JS viejo). Si cambió la
  lista `PRECARGA_ESTATICOS` de `sw.js`, sube también su `VERSION`.
- **Precios**: cualquier cambio en `lib/configuracion.js`, `api/crear-pedido.js`
  o `lib/pedidos.js` → el servidor debe seguir recalculando el precio desde la
  base, nunca usar el que manda el navegador.
- **Rutas de admin nuevas**: van como `case` en `api/admin/[seccion].js`, no
  como archivo nuevo (límite de 12 funciones; el script lo verifica).
- **Esquema**: si se tocó `scripts/schema.sql`, la migración (`npm run db:migrate`)
  corre contra la base real → confirmar con el usuario antes.
- **Integración con el taller** (`lib/produccion.js`): sigue mandando `pesoCera`,
  una OT por línea del carrito y `origenCatalogoId` estable.

## 4. Desplegar

Solo con `npm test` en verde (0 fallas):

1. `vercel deploy` (preview) → `npm test -- --url=<url del preview>`.
2. Si pasa, **pedir confirmación al usuario** y recién ahí `vercel --prod`.
3. Después del deploy a producción, una pasada rápida sin admin:
   `npm test -- --url=https://catalogo-dinar3dwx.vercel.app --sin-navegador`.

## 5. Mantener las pruebas

Cuando se agregue una página o endpoint nuevo, agrégalo en
`scripts/probar.mjs` (`PAGINAS_PUBLICAS`, `SECCIONES_ADMIN_GET` o una
comprobación propia). Las páginas de `admin/*.html` se recorren solas.
Si se corrige un bug, agrega una comprobación que lo habría detectado.
