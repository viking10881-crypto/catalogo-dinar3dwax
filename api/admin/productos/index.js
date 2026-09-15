import { requiereAdmin } from "../../lib/adminAuth.js";
import { listarProductos, obtenerProducto, crearProducto } from "../../lib/productos.js";
import { validarProducto } from "../../lib/validarProducto.js";

export default async function handler(req, res) {
  if (!requiereAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const productos = await listarProductos();
      res.status(200).json(productos);
    } catch (err) {
      console.error("Error listando productos (admin):", err);
      res.status(500).json({ error: "No se pudo cargar el catálogo" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { datos, errores } = validarProducto(req.body || {});
      if (errores.length > 0) {
        res.status(400).json({ error: errores.join(". ") });
        return;
      }

      const existente = await obtenerProducto(datos.referencia);
      if (existente) {
        res.status(409).json({ error: `Ya existe un producto con la referencia ${datos.referencia}` });
        return;
      }

      await crearProducto(datos);
      res.status(201).json({ ok: true, referencia: datos.referencia });
    } catch (err) {
      console.error("Error creando producto:", err);
      res.status(500).json({ error: "No se pudo crear el producto" });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
