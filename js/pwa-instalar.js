/**
 * Prompt de instalación de la PWA (solo index.html). El evento
 * "beforeinstallprompt" ya se capturó lo antes posible en un <script>
 * inline en el <head> (ver index.html) porque para cuando este archivo
 * carga, al final del body, puede que ya haya llegado y se perdería.
 */
const CLAVE_CERRADO = "pwa-instalar-cerrado";

function yaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function esIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function esMovil() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function fueCerrada() {
  try {
    return localStorage.getItem(CLAVE_CERRADO) === "1";
  } catch (e) {
    return false;
  }
}

function marcarCerrada() {
  try {
    localStorage.setItem(CLAVE_CERRADO, "1");
  } catch (e) {
    // localStorage puede fallar (privado/bloqueado): no es crítico, la
    // tarjeta simplemente volverá a aparecer en la próxima visita.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tarjeta = document.getElementById("tarjeta-instalar-pwa");
  const btnInstalar = document.getElementById("btn-instalar-pwa");
  const btnCerrar = document.getElementById("btn-cerrar-instalar-pwa");
  const instrucciones = document.getElementById("instrucciones-instalar-pwa");
  const btnPermanente = document.getElementById("btn-instalar-pwa-permanente");
  if (!tarjeta || !btnPermanente) return;

  if (yaInstalada()) return; // instalada: ni la tarjeta ni el botón permanente tienen sentido

  const esIphone = esIOS();

  async function instalarAndroid() {
    const evento = window.__pwaEventoInstalar;
    if (!evento) return;
    evento.prompt();
    try {
      await evento.userChoice;
    } catch (e) {
      // el usuario cerró el diálogo nativo sin elegir: no hay nada que hacer
    }
    window.__pwaEventoInstalar = null;
    ocultarTarjeta();
  }

  function mostrarInstruccionesIOS() {
    instrucciones.textContent = "Toca el ícono de compartir ⬆️ de Safari y luego \"Agregar a pantalla de inicio\".";
    btnInstalar.classList.add("oculto");
  }

  function mostrarBotonAndroid() {
    instrucciones.textContent = "Agrégala a tu pantalla de inicio para abrirla como una app, sin el navegador.";
    btnInstalar.classList.remove("oculto");
  }

  function mostrarTarjeta() {
    if (fueCerrada() || !esMovil()) return;
    if (esIphone) {
      mostrarInstruccionesIOS();
      tarjeta.classList.remove("oculto");
    } else if (window.__pwaEventoInstalar) {
      mostrarBotonAndroid();
      tarjeta.classList.remove("oculto");
    }
  }

  function ocultarTarjeta() {
    tarjeta.classList.add("oculto");
  }

  // El botón permanente aparece apenas sepamos que hay algo que ofrecer:
  // en iOS siempre (son solo instrucciones), en Android/Chrome solo una
  // vez que el navegador avisó que es instalable.
  if (esIphone) btnPermanente.classList.remove("oculto");
  if (window.__pwaEventoInstalar) btnPermanente.classList.remove("oculto");
  window.addEventListener("pwa-instalable", () => {
    btnPermanente.classList.remove("oculto");
    mostrarTarjeta();
  });
  window.addEventListener("pwa-instalada", () => {
    ocultarTarjeta();
    btnPermanente.classList.add("oculto");
  });

  btnInstalar?.addEventListener("click", instalarAndroid);
  btnCerrar?.addEventListener("click", () => {
    ocultarTarjeta();
    marcarCerrada();
  });
  btnPermanente.addEventListener("click", () => {
    if (esIphone) {
      mostrarInstruccionesIOS();
      tarjeta.classList.remove("oculto");
    } else if (window.__pwaEventoInstalar) {
      instalarAndroid();
    }
  });

  mostrarTarjeta();
});
