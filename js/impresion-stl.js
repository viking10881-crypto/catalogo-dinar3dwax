/**
 * Formulario "Cotizar impresión" (sección Impresión STL de index.html): el
 * cliente ya trae su archivo STL y solo pide imprimirlo en cera. Mismo flujo
 * que js/personalizados.js — el archivo sube directo del navegador a Vercel
 * Blob (STL de hasta 100 MB, muy por encima del límite de 4.5 MB de body de
 * Vercel) y después se crea la solicitud con tipoSolicitud "impresion", que
 * llega al mismo panel de Solicitudes y avisa por correo.
 */
// Solo STL: es el formato que imprime el taller.
const EXTENSIONES_STL = /\.stl$/i;
const MAX_MB_STL = 100;

async function subirStlABlob(archivo, alProgreso) {
  const { upload } = await import("https://esm.sh/@vercel/blob@2.8.0/client");
  const nombreLimpio = archivo.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
  const blob = await upload(`solicitudes-diseno/stl/${nombreLimpio}`, archivo, {
    access: "public",
    handleUploadUrl: "/api/solicitudes-diseno",
    multipart: archivo.size > 20 * 1024 * 1024,
    onUploadProgress: (p) => alProgreso(Math.round(p.percentage)),
  });
  return blob.url;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-impresion-stl");
  if (!form) return;

  const inputArchivo = document.getElementById("stl-archivo");
  const dropzone = document.getElementById("stl-dropzone");
  const titulo = document.getElementById("stl-dropzone-titulo");
  const nota = document.getElementById("stl-dropzone-nota");
  const tituloOriginal = titulo.textContent;
  const notaOriginal = nota.textContent;
  const btnQuitar = document.getElementById("btn-quitar-stl");
  const mensaje = document.getElementById("stl-mensaje");
  const btnEnviar = document.getElementById("btn-enviar-stl");
  const envoltura = document.getElementById("stl-formulario-envoltura");
  const exito = document.getElementById("stl-exito");

  let archivoElegido = null;

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = "pers-mensaje" + (tipo ? " " + tipo : "");
  }

  function elegirArchivo(archivo) {
    if (!archivo) return;
    if (!EXTENSIONES_STL.test(archivo.name)) {
      mostrarMensaje("El archivo debe ser .STL.", "error");
      return;
    }
    if (archivo.size > MAX_MB_STL * 1024 * 1024) {
      mostrarMensaje(`El archivo pesa más de ${MAX_MB_STL} MB.`, "error");
      return;
    }
    archivoElegido = archivo;
    titulo.textContent = archivo.name;
    nota.textContent = `${(archivo.size / (1024 * 1024)).toFixed(1)} MB · listo para enviar`;
    dropzone.classList.add("con-archivo");
    btnQuitar.classList.remove("oculto");
    mostrarMensaje("");
  }

  function quitarArchivo() {
    archivoElegido = null;
    inputArchivo.value = "";
    titulo.textContent = tituloOriginal;
    nota.textContent = notaOriginal;
    dropzone.classList.remove("con-archivo");
    btnQuitar.classList.add("oculto");
  }

  inputArchivo.addEventListener("change", () => elegirArchivo(inputArchivo.files[0]));
  btnQuitar.addEventListener("click", quitarArchivo);

  ["dragenter", "dragover"].forEach((evento) =>
    dropzone.addEventListener(evento, (e) => {
      e.preventDefault();
      dropzone.classList.add("arrastrando");
    })
  );
  ["dragleave", "drop"].forEach((evento) =>
    dropzone.addEventListener(evento, (e) => {
      e.preventDefault();
      dropzone.classList.remove("arrastrando");
    })
  );
  dropzone.addEventListener("drop", (e) => elegirArchivo(e.dataTransfer.files[0]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
      tipoSolicitud: "impresion",
      nombre: document.getElementById("stl-nombre").value.trim(),
      whatsapp: document.getElementById("stl-whatsapp").value.trim(),
      cantidad: Number(document.getElementById("stl-cantidad").value),
      descripcion: document.getElementById("stl-notas").value.trim(),
      sitioWeb: document.getElementById("stl-sitio-web").value,
      archivoUrl: "",
      archivoNombre: "",
    };

    if (!archivoElegido) {
      dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
      return mostrarMensaje("Adjunta el archivo que quieres imprimir (arriba, en la zona de arrastre).", "error");
    }
    if (!datos.nombre) return mostrarMensaje("Escribe tu nombre.", "error");
    if (datos.whatsapp.replace(/\D/g, "").length < 7) {
      return mostrarMensaje("Escribe un número de WhatsApp válido.", "error");
    }
    if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 999) {
      return mostrarMensaje("La cantidad debe ser entre 1 y 999.", "error");
    }

    btnEnviar.disabled = true;
    try {
      datos.archivoUrl = await subirStlABlob(archivoElegido, (pct) => mostrarMensaje(`Subiendo archivo... ${pct}%`));
      datos.archivoNombre = archivoElegido.name;

      mostrarMensaje("Enviando solicitud...");
      const r = await fetch("/api/solicitudes-diseno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const resultado = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resultado.error || "No se pudo enviar tu solicitud. Intenta de nuevo.");

      form.reset();
      quitarArchivo();
      mostrarMensaje("");
      envoltura.classList.add("oculto");
      exito.classList.remove("oculto");
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo enviar tu solicitud. Intenta de nuevo.", "error");
    } finally {
      btnEnviar.disabled = false;
    }
  });

  document.getElementById("btn-nueva-stl").addEventListener("click", () => {
    exito.classList.add("oculto");
    envoltura.classList.remove("oculto");
    document.getElementById("stl-nombre").focus();
  });
});
