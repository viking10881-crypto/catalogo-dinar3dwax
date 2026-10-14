/**
 * Registro del service worker. Solo fuera de localhost: en desarrollo
 * (vercel dev) un service worker viejo quedándose activo entre cambios de
 * código da más dolores de cabeza que beneficio.
 */
(function () {
  if (!("serviceWorker" in navigator)) return;
  if (["localhost", "127.0.0.1"].includes(location.hostname)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Si falla el registro (ej. navegador sin soporte real pese al check
      // de arriba), el sitio sigue funcionando normal, solo sin PWA.
    });
  });
})();
