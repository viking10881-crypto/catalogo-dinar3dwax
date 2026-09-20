/**
 * Visor de PDF en modal para la sección "Recursos para joyeros" (solo
 * index.html): abre el documento dentro de la misma página en vez de
 * dejar que el navegador navegue al archivo suelto.
 *
 * "#toolbar=0&navpanes=0" oculta la barra de herramientas nativa del
 * visor de PDF de Chrome/Edge (que trae su propio botón de descarga), y
 * el clic derecho queda bloqueado en el iframe. Esto no es una protección
 * real del archivo — el PDF igual viaja al navegador para poder
 * mostrarlo — solo saca la descarga de "un clic" del flujo normal.
 */
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal-pdf");
  if (!modal) return;

  const iframe = document.getElementById("modal-pdf-iframe");
  const tituloEl = document.getElementById("modal-pdf-titulo");

  function abrirModalPdf(url, titulo) {
    tituloEl.textContent = titulo;
    iframe.src = `${url}#toolbar=0&navpanes=0`;
    modal.classList.remove("oculto");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("con-modal-pdf");
  }

  function cerrarModalPdf() {
    modal.classList.add("oculto");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("con-modal-pdf");
    iframe.src = "";
  }

  document.querySelectorAll(".btn-ver-recurso").forEach((boton) => {
    boton.addEventListener("click", () => {
      abrirModalPdf(boton.dataset.pdf, boton.dataset.titulo || "Documento");
    });
  });

  modal.querySelectorAll("[data-cerrar-modal-pdf]").forEach((el) => {
    el.addEventListener("click", cerrarModalPdf);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("oculto")) cerrarModalPdf();
  });
});
