/**
 * Modo oscuro/claro, compartido por las 6 páginas públicas del sitio. El
 * atributo data-tema ya se aplica antes de este script (ver el <script>
 * inline en el <head> de cada página) para evitar parpadeo; acá solo se
 * conecta el botón y se guarda la preferencia.
 */
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try {
    localStorage.setItem("tema-sitio", tema);
  } catch (err) {
    // localStorage puede fallar (modo privado, storage bloqueado); no es crítico.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const boton = document.getElementById("toggle-tema");
  if (!boton) return;
  boton.addEventListener("click", () => {
    const actual = document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro";
    aplicarTema(actual === "oscuro" ? "claro" : "oscuro");
  });
});
