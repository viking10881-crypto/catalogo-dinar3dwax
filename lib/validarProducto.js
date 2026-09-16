const TIPOS_VALIDOS = ["anillos", "dijes", "aretes", "cadenas", "pulseras"];

export function validarProducto(body, { exigirReferencia = true } = {}) {
  const errores = [];
  const datos = {};

  if (exigirReferencia) {
    datos.referencia = String(body.referencia || "").trim().toUpperCase();
    if (!datos.referencia) errores.push("La referencia es obligatoria");
  }

  datos.tipo = String(body.tipo || "").trim();
  if (!TIPOS_VALIDOS.includes(datos.tipo)) {
    errores.push(`El tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`);
  }

  datos.nombre = String(body.nombre || "").trim();
  if (!datos.nombre) errores.push("El nombre es obligatorio");

  datos.descripcion = String(body.descripcion || "").trim();
  datos.material = String(body.material || "").trim();
  datos.materialTipo = String(body.materialTipo || "").trim() || "Oro 18k";
  datos.imagenes = Array.isArray(body.imagenes)
    ? body.imagenes.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  datos.modeloStl = String(body.modeloStl || "").trim();

  datos.volumen = Number(body.volumen);
  if (!Number.isFinite(datos.volumen) || datos.volumen < 0) errores.push("Volumen inválido");

  datos.peso = Number(body.peso);
  if (!Number.isFinite(datos.peso) || datos.peso < 0) errores.push("Peso inválido");

  datos.pesoCera = Number(body.pesoCera);
  if (!Number.isFinite(datos.pesoCera) || datos.pesoCera < 0) errores.push("Peso de la cera inválido");

  datos.precioBase = Number(body.precioBase);
  if (!Number.isFinite(datos.precioBase) || datos.precioBase <= 0) {
    errores.push("El precio base debe ser mayor a 0");
  }

  datos.tallas = Array.isArray(body.tallas) ? body.tallas.filter((t) => t !== "" && t !== null) : [];

  datos.medidas =
    body.medidas && typeof body.medidas === "object" && !Array.isArray(body.medidas)
      ? body.medidas
      : {};

  return { datos, errores };
}
