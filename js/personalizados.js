/**
 * Formulario "Solicita tu diseño" (sección Servicios 3D de index.html). El archivo de
 * referencia se sube directo del navegador a Vercel Blob (igual que el
 * comprobante del checkout, por el límite de 4.5 MB de body de Vercel) y
 * después se manda la solicitud a /api/solicitudes-diseno, que la guarda
 * para el panel y avisa por correo a la joyería.
 */
const TIPOS_ARCHIVO_REFERENCIA = ["image/jpeg", "image/png", "application/pdf"];
const MAX_MB_REFERENCIA = 20;

async function subirReferenciaABlob(archivo) {
  const { upload } = await import("https://esm.sh/@vercel/blob@2.8.0/client");
  const nombreLimpio = archivo.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
  const blob = await upload(`solicitudes-diseno/${nombreLimpio || "referencia"}`, archivo, {
    access: "public",
    handleUploadUrl: "/api/solicitudes-diseno",
  });
  return blob.url;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-solicitud-diseno");
  if (!form) return;

  const inputArchivo = document.getElementById("sol-archivo");
  const dropzone = document.getElementById("pers-dropzone");
  const textoDropzone = document.getElementById("pers-dropzone-texto");
  const textoDropzoneOriginal = textoDropzone.innerHTML;
  const btnQuitar = document.getElementById("btn-quitar-archivo");
  const mensaje = document.getElementById("pers-mensaje");
  const btnEnviar = document.getElementById("btn-enviar-solicitud");
  const envoltura = document.getElementById("pers-formulario-envoltura");
  const exito = document.getElementById("pers-exito");

  let archivoElegido = null;

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = "pers-mensaje" + (tipo ? " " + tipo : "");
  }

  function elegirArchivo(archivo) {
    if (!archivo) return;
    if (!TIPOS_ARCHIVO_REFERENCIA.includes(archivo.type)) {
      mostrarMensaje("El archivo debe ser JPG, PNG o PDF.", "error");
      return;
    }
    if (archivo.size > MAX_MB_REFERENCIA * 1024 * 1024) {
      mostrarMensaje(`El archivo pesa más de ${MAX_MB_REFERENCIA} MB.`, "error");
      return;
    }
    archivoElegido = archivo;
    textoDropzone.textContent = archivo.name;
    dropzone.classList.add("con-archivo");
    btnQuitar.classList.remove("oculto");
    mostrarMensaje("");
  }

  function quitarArchivo() {
    archivoElegido = null;
    inputArchivo.value = "";
    textoDropzone.innerHTML = textoDropzoneOriginal;
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
      nombre: document.getElementById("sol-nombre").value.trim(),
      whatsapp: document.getElementById("sol-whatsapp").value.trim(),
      tipoJoya: document.getElementById("sol-tipo").value,
      descripcion: document.getElementById("sol-descripcion").value.trim(),
      sitioWeb: document.getElementById("sol-sitio-web").value,
      archivoUrl: "",
      archivoNombre: "",
    };

    if (!datos.nombre) return mostrarMensaje("Escribe tu nombre.", "error");
    if (datos.whatsapp.replace(/\D/g, "").length < 7) {
      return mostrarMensaje("Escribe un número de WhatsApp válido.", "error");
    }
    if (!datos.descripcion) return mostrarMensaje("Cuéntanos tu idea en la descripción.", "error");

    btnEnviar.disabled = true;
    try {
      if (archivoElegido) {
        mostrarMensaje("Subiendo archivo...");
        datos.archivoUrl = await subirReferenciaABlob(archivoElegido);
        datos.archivoNombre = archivoElegido.name;
      }

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

  document.getElementById("btn-nueva-solicitud").addEventListener("click", () => {
    exito.classList.add("oculto");
    envoltura.classList.remove("oculto");
    document.getElementById("sol-nombre").focus();
  });
});
