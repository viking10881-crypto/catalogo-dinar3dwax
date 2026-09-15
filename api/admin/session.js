import { sesionValida } from "../lib/adminAuth.js";

export default async function handler(req, res) {
  res.status(200).json({ autenticado: sesionValida(req) });
}
