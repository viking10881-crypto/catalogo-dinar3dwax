CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  cliente_whatsapp TEXT NOT NULL,
  cliente_ciudad TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  cliente_correo TEXT NOT NULL,
  items JSONB NOT NULL,
  total NUMERIC(12, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  comprobante_url TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante_url TEXT NOT NULL DEFAULT '';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS produccion_estado TEXT NOT NULL DEFAULT 'sin_enviar';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS produccion_info JSONB NOT NULL DEFAULT '{}';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_cedula TEXT NOT NULL DEFAULT '';

CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START WITH 100001;

CREATE TABLE IF NOT EXISTS productos (
  referencia TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  peso NUMERIC(10, 2) NOT NULL DEFAULT 0,
  peso_cera NUMERIC(10, 2) NOT NULL DEFAULT 0,
  material_tipo TEXT NOT NULL DEFAULT 'Oro 18k',
  precio_base NUMERIC(12, 2) NOT NULL,
  material TEXT NOT NULL DEFAULT '',
  medidas JSONB NOT NULL DEFAULT '{}',
  tallas JSONB NOT NULL DEFAULT '[]',
  imagenes JSONB NOT NULL DEFAULT '[]',
  modelo_stl TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE productos ADD COLUMN IF NOT EXISTS modelo_stl TEXT NOT NULL DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '[]';
ALTER TABLE productos DROP COLUMN IF EXISTS imagen;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso_cera NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS material_tipo TEXT NOT NULL DEFAULT 'Oro 18k';
ALTER TABLE productos DROP COLUMN IF EXISTS volumen;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS subcategoria TEXT NOT NULL DEFAULT '';

-- Fila única (id siempre 1) con la configuración editable del sitio.
CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whatsapp_numero TEXT NOT NULL DEFAULT '573028432867',
  divisor_peso_oro18k NUMERIC(10, 4) NOT NULL DEFAULT 16.5,
  precio_por_gramo_cera NUMERIC(12, 2) NOT NULL DEFAULT 50000,
  banco_nombre TEXT NOT NULL DEFAULT 'Bancolombia',
  banco_tipo_cuenta TEXT NOT NULL DEFAULT 'Ahorros',
  banco_numero_cuenta TEXT NOT NULL DEFAULT '',
  banco_titular TEXT NOT NULL DEFAULT '',
  banco_documento TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT configuracion_fila_unica CHECK (id = 1)
);
INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banco_nombre TEXT NOT NULL DEFAULT 'Bancolombia';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT NOT NULL DEFAULT 'Ahorros';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banco_numero_cuenta TEXT NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banco_titular TEXT NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banco_documento TEXT NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS banner_imagenes JSONB NOT NULL DEFAULT '[]';

-- Personas que trabajan para el taller (diseñadores u otro rol), para poder
-- registrarles pagos por sus servicios. Se muestran como "Colaborador" en
-- el admin (pedido del cliente) pero la tabla/columnas se quedan con el
-- nombre original: renombrarlas es una migración de datos aparte que no
-- aporta nada visible, solo riesgo.
CREATE TABLE IF NOT EXISTS trabajadores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Diseñador',
  telefono TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'CC';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS correo TEXT NOT NULL DEFAULT '';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS direccion TEXT NOT NULL DEFAULT '';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS foto_url TEXT NOT NULL DEFAULT '';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS banco_nombre TEXT NOT NULL DEFAULT '';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS banco_numero_cuenta TEXT NOT NULL DEFAULT '';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS banco_tipo_cuenta TEXT NOT NULL DEFAULT 'Ahorros';

-- Registro de compras/consumo de materiales (cera, oro, etc.).
CREATE TABLE IF NOT EXISTS materiales (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'g',
  costo_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  proveedor TEXT NOT NULL DEFAULT '',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagos hechos a un trabajador por sus servicios (p. ej. diseños entregados).
CREATE TABLE IF NOT EXISTS pagos_trabajadores (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL DEFAULT '',
  monto NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago TEXT NOT NULL DEFAULT 'Transferencia',
  notas TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitudes de diseño personalizado (página pública personalizados.html):
-- el cliente describe la joya que quiere y opcionalmente adjunta una
-- referencia (imagen/boceto/PDF, subida directo a Blob). Se gestionan desde
-- /admin/solicitudes.html, y cada solicitud nueva también avisa por correo.
CREATE TABLE IF NOT EXISTS solicitudes_diseno (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  tipo_joya TEXT NOT NULL DEFAULT '',
  presupuesto TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  archivo_url TEXT NOT NULL DEFAULT '',
  archivo_nombre TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'nueva',
  notas TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cotización y entrega de la solicitud (página de detalle del admin):
-- precio y tiempo que se le cotizan al cliente, y los archivos terminados
-- (STL, 3DM, renders, video) como lista JSON de { url, nombre }.
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS precio_cotizado NUMERIC(12, 2);
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS entregables JSONB NOT NULL DEFAULT '[]';
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now();

-- La misma tabla recibe también las solicitudes de impresión de un STL
-- que ya trae el cliente (sección "Impresión STL" de index.html): se
-- distinguen por tipo_solicitud ('diseno' | 'impresion'), y "cantidad" es
-- cuántas piezas en cera pide de ese archivo.
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS tipo_solicitud TEXT NOT NULL DEFAULT 'diseno';
ALTER TABLE solicitudes_diseno ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;
