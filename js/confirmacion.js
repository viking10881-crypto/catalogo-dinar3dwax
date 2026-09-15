/**
 * Página de confirmación: consulta el estado real del pedido en el backend
 * (el pago se verifica manualmente contra el comprobante subido, no hay
 * pasarela automática) y arma el mensaje de WhatsApp prellenado.
 */
const ETIQUETAS_ESTADO = {
  aprobado: {
    texto: "Pago aprobado",
    clase: "aprobado",
    mensaje: "¡Gracias por tu compra! Ya verificamos tu pago.",
  },
  pendiente: {
    texto: "Verificando pago",
    clase: "pendiente",
    mensaje: "Recibimos tu pedido y tu comprobante. Estamos verificando la transferencia y te confirmamos por WhatsApp.",
  },
  rechazado: {
    texto: "Pago rechazado",
    clase: "rechazado",
    mensaje: "No pudimos verificar tu transferencia. Escríbenos por WhatsApp para resolverlo.",
  },
};

async function cargarConfirmacion() {
  const params = new URLSearchParams(window.location.search);
  const ordenId =
    params.get("orden") ||
    params.get("external_reference") ||
    sessionStorage.getItem("dinar_ultima_orden");

  const cargando = document.getElementById("confirmacion-cargando");
  const contenido = document.getElementById("confirmacion-contenido");
  const errorEl = document.getElementById("confirmacion-error");

  if (!ordenId) {
    cargando.classList.add("oculto");
    errorEl.classList.remove("oculto");
    return;
  }

  try {
    await configuracionLista;
    const respuesta = await fetch(`/api/verificar-pago?orden=${encodeURIComponent(ordenId)}`);
    if (!respuesta.ok) throw new Error("orden no encontrada");
    const orden = await respuesta.json();

    cargando.classList.add("oculto");
    contenido.classList.remove("oculto");

    document.getElementById("numero-orden").textContent = `#${orden.id}`;
    document.getElementById("total-orden").textContent = formatearPrecio(orden.total);

    const estado = ETIQUETAS_ESTADO[orden.estado] || ETIQUETAS_ESTADO.pendiente;
    const estadoEl = document.getElementById("estado-orden");
    estadoEl.textContent = estado.texto;
    estadoEl.className = `estado-pago ${estado.clase}`;
    document.getElementById("mensaje-estado-orden").textContent = estado.mensaje;

    const mensaje = encodeURIComponent(
      `Hola Dinar 3D Wax.\n\nAcabo de realizar el pedido #${orden.id} y ya subí mi comprobante de transferencia.\n\nValor: ${formatearPrecio(
        orden.total
      )}\n\nQuedo atento a la confirmación.`
    );
    document
      .getElementById("btn-whatsapp")
      .setAttribute("href", `https://wa.me/${CONFIG.whatsappNumero}?text=${mensaje}`);

    sessionStorage.removeItem("dinar_ultima_orden");
    vaciarCarrito();
  } catch (err) {
    cargando.classList.add("oculto");
    errorEl.classList.remove("oculto");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("confirmacion-contenido")) cargarConfirmacion();
});
