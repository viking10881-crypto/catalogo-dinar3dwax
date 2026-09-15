import { del } from "@vercel/blob";
import { requiereAdmin } from "../../lib/adminAuth.js";
import { obtenerProducto, actualizarProducto, eliminarProducto } from "../../lib/productos.js";
import { validarProducto } from "../../lib/validarProducto.js";
import { esUrlDeNuestroBlob } from "../../lib/blob.js";

export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  const referencia = String(req.query.referencia || "").toUpperCase();

  if (req.method === "GET") {
    try {
      const producto = await obtenerProducto(referencia);
      if (!producto) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }
      res.status(200).json(producto);
    } catch (err) {
      console.error("Error obteniendo producto:", err);
      res.status(500).json({ error: "No se pudo cargar el producto" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const existente = await obtenerProducto(referencia);
      if (!existente) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }

      const { datos, errores } = validarProducto(req.body || {}, { exigirReferencia: false });
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }

      await actualizarProducto(referencia, datos);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error actualizando producto:", err);
      res.status(500).json({ error: "No se pudo actualizar el producto" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const producto = await obtenerProducto(referencia);
      await eliminarProducto(referencia);

      // Limpieza del storage: nunca debe bloquear la respuesta si falla.
      if (producto) {
        const archivos = [...(producto.imagenes || []), producto.modeloStl].filter(esUrlDeNuestroBlob);
        await Promise.all(
          archivos.map((url) => del(url).catch((err) => console.error("No se pudo borrar archivo:", url, err)))
        );
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error eliminando producto:", err);
      res.status(500).json({ error: "No se pudo eliminar el producto" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
