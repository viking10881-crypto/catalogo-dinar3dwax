/**
 * Checkout: valida datos del cliente, muestra el resumen y los datos
 * bancarios, recibe el comprobante de la transferencia y crea el pedido
 * (queda "pendiente" hasta que el admin verifique el pago manualmente).
 */
function renderResumenCheckout() {
  const contenedor = document.getElementById("resumen-items-checkout");
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    window.location.href = "carrito.html";
    return;
  }

  contenedor.innerHTML = carrito
    .map((linea) => {
      const info = infoLineaCarrito(linea);
      if (!info) return "";
      const subtotal = info.precioUnitario * linea.cantidad;
      return `
        <div class="linea">
          <span>${info.nombre} ${linea.talla ? `(talla ${linea.talla})` : ""} × ${linea.cantidad}</span>
          <span>${formatearPrecio(subtotal)}</span>
        </div>
      `;
    })
    .join("");

  const total = calcularSubtotalCarrito();
  document.getElementById("total-checkout").textContent = formatearPrecio(total);
}

function renderDatosBanco() {
  document.getElementById("datos-banco").innerHTML = `
    <div class="linea"><span>Banco</span><span>${CONFIG.bancoNombre}</span></div>
    <div class="linea"><span>Tipo de cuenta</span><span>${CONFIG.bancoTipoCuenta}</span></div>
    <div class="linea"><span>Número de cuenta</span><span>${CONFIG.bancoNumeroCuenta}</span></div>
    <div class="linea"><span>Titular</span><span>${CONFIG.bancoTitular}</span></div>
    <div class="linea"><span>Documento</span><span>${CONFIG.bancoDocumento}</span></div>
  `;
}

function validarCampo(campo) {
  const errorEl = campo.parentElement.querySelector(".error-campo");
  if (!campo.value.trim()) {
    if (errorEl) errorEl.style.display = "block";
    campo.style.borderColor = "#b23b3b";
    return false;
  }
  if (errorEl) errorEl.style.display = "none";
  campo.style.borderColor = "";
  return true;
}

function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = reject;
    lector.readAsDataURL(file);
  });
}

let comprobanteUrl = "";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-checkout");
  if (!form) return;

  await Promise.all([productosListos, configuracionLista]);
  renderResumenCheckout();
  renderDatosBanco();

  const campos = ["nombre", "whatsapp", "ciudad", "direccion", "correo"].map((id) =>
    document.getElementById(id)
  );

  const btnConfirmar = document.getElementById("btn-confirmar-pedido");
  const mensajeError = document.getElementById("mensaje-error-checkout");
  const mensajeComprobante = document.getElementById("mensaje-comprobante");

  document.getElementById("archivo-comprobante").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    comprobanteUrl = "";
    btnConfirmar.disabled = true;
    mensajeComprobante.textContent = "";
    mensajeComprobante.className = "mensaje-admin";
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "application/pdf"].includes(archivo.type)) {
      mensajeComprobante.textContent = "Formato no soportado. Usa JPG, PNG o PDF.";
      mensajeComprobante.className = "mensaje-admin error";
      e.target.value = "";
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      mensajeComprobante.textContent = "El archivo no puede superar 8 MB.";
      mensajeComprobante.className = "mensaje-admin error";
      e.target.value = "";
      return;
    }

    mensajeComprobante.textContent = "Subiendo comprobante...";

    try {
      const datosBase64 = await archivoABase64(archivo);
      const r = await fetch("/api/subir-comprobante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: archivo.type, datosBase64 }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error || "No se pudo subir el comprobante");

      comprobanteUrl = datos.url;
      btnConfirmar.disabled = false;
      mensajeComprobante.textContent = "Comprobante subido correctamente.";
      mensajeComprobante.className = "mensaje-admin ok";
    } catch (err) {
      mensajeComprobante.textContent = err.message || "No se pudo subir el comprobante.";
      mensajeComprobante.className = "mensaje-admin error";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensajeError.textContent = "";

    const camposValidos = campos.map(validarCampo).every(Boolean);
    if (!camposValidos) return;

    if (!comprobanteUrl) {
      mensajeError.textContent = "Sube el comprobante de tu transferencia antes de confirmar el pedido.";
      return;
    }

    const carrito = obtenerCarrito();
    const items = carrito
      .map((linea) => {
        const info = infoLineaCarrito(linea);
        if (!info) return null;
        return {
          referencia: linea.referencia || "PERSONALIZADO",
          nombre: info.nombre,
          talla: linea.talla || null,
          cantidad: linea.cantidad,
          precioUnitario: info.precioUnitario,
          peso: linea.personalizado ? linea.peso : undefined,
        };
      })
      .filter(Boolean);

    const cliente = {
      nombre: document.getElementById("nombre").value.trim(),
      whatsapp: document.getElementById("whatsapp").value.trim(),
      ciudad: document.getElementById("ciudad").value.trim(),
      direccion: document.getElementById("direccion").value.trim(),
      correo: document.getElementById("correo").value.trim(),
    };

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Confirmando...";

    try {
      const respuesta = await fetch("/api/crear-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente, items, comprobanteUrl }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo confirmar el pedido");

      sessionStorage.setItem("dinar_ultima_orden", datos.ordenId);
      window.location.href = `confirmacion.html?orden=${encodeURIComponent(datos.ordenId)}`;
    } catch (err) {
      mensajeError.textContent = err.message || "No pudimos confirmar el pedido. Intenta nuevamente.";
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Confirmar pedido";
    }
  });
});
