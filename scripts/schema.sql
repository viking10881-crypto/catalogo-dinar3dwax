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
