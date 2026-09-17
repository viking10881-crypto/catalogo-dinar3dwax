import { getSql } from "./db.js";

export async function obtenerConfiguracion() {
  const sql = getSql();
  const [fila] = await sql`SELECT * FROM configuracion WHERE id = 1`;
  return {
    whatsappNumero: fila.whatsapp_numero,
    divisorPesoOro18k: Number(fila.divisor_peso_oro18k),
    precioPorGramoCera: Number(fila.precio_por_gramo_cera),
    bancoNombre: fila.banco_nombre,
    bancoTipoCuenta: fila.banco_tipo_cuenta,
    bancoNumeroCuenta: fila.banco_numero_cuenta,
    bancoTitular: fila.banco_titular,
    bancoDocumento: fila.banco_documento,
    bannerImagenes: fila.banner_imagenes,
  };
}

export async function actualizarConfiguracion({
  whatsappNumero,
  divisorPesoOro18k,
  precioPorGramoCera,
  bancoNombre,
  bancoTipoCuenta,
  bancoNumeroCuenta,
  bancoTitular,
  bancoDocumento,
  bannerImagenes,
}) {
  const sql = getSql();
  await sql`
    UPDATE configuracion SET
      whatsapp_numero = ${whatsappNumero},
      divisor_peso_oro18k = ${divisorPesoOro18k},
      precio_por_gramo_cera = ${precioPorGramoCera},
      banco_nombre = ${bancoNombre},
      banco_tipo_cuenta = ${bancoTipoCuenta},
      banco_numero_cuenta = ${bancoNumeroCuenta},
      banco_titular = ${bancoTitular},
      banco_documento = ${bancoDocumento},
      banner_imagenes = ${JSON.stringify(bannerImagenes || [])},
      actualizado_en = now()
    WHERE id = 1
  `;
}

/**
 * Debe dar el mismo resultado que calcularPrecioServicio() en
 * js/productos.js (fórmula de la calculadora): peso oro 18k ÷
 * divisorPesoOro18k, truncado (no redondeado) a 2 decimales, ×
 * precioPorGramoCera. Ej: 10 g ÷ 16.5 = 0.6060... → se corta a 0.60 →
 * 0.60 × 50.000 = $30.000.
 */
export function calcularPrecioServicio(pesoOro18k, configuracion) {
  const pesoCera = Math.trunc((pesoOro18k / configuracion.divisorPesoOro18k) * 100) / 100;
  return Math.round(pesoCera * configuracion.precioPorGramoCera);
}
