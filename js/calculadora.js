/**
 * Calculadora de servicio: estima el precio de una pieza a partir de su
 * peso (equivalente en oro 18k), sin necesidad de tener una referencia.
 */
function actualizarCalculadora() {
  const peso = parseFloat(document.getElementById("calc-peso").value) || 0;
  const cantidad = parseInt(document.getElementById("calc-cantidad").value) || 1;

  const precioPorPieza = calcularPrecioServicio(peso);
  const total = precioPorPieza * cantidad;

  document.getElementById("calc-precio-pieza").textContent = formatearPrecio(precioPorPieza);
  document.getElementById("calc-cantidad-resumen").textContent = cantidad;
  document.getElementById("calc-total").textContent = formatearPrecio(total);

  const btnAgregar = document.getElementById("btn-agregar-calculadora");
  btnAgregar.disabled = peso <= 0;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("form-calculadora")) return;

  await configuracionLista;
  actualizarCalculadora();

  ["calc-peso"].forEach((id) => {
    document.getElementById(id).addEventListener("input", actualizarCalculadora);
  });

  const campoCantidad = document.getElementById("calc-cantidad");
  document.getElementById("calc-btn-menos").addEventListener("click", () => {
    campoCantidad.value = Math.max(1, (parseInt(campoCantidad.value) || 1) - 1);
    actualizarCalculadora();
  });
  document.getElementById("calc-btn-mas").addEventListener("click", () => {
    campoCantidad.value = (parseInt(campoCantidad.value) || 1) + 1;
    actualizarCalculadora();
  });
  campoCantidad.addEventListener("input", actualizarCalculadora);

  document.getElementById("btn-agregar-calculadora").addEventListener("click", () => {
    const peso = parseFloat(document.getElementById("calc-peso").value) || 0;
    const cantidad = parseInt(document.getElementById("calc-cantidad").value) || 1;
    if (peso <= 0) return;
    agregarPersonalizadoAlCarrito({
      peso,
      precioUnitario: calcularPrecioServicio(peso),
      cantidad,
    });
    window.location.href = "carrito.html";
  });
});
