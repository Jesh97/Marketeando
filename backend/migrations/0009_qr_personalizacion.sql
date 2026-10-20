-- =====================================================================
-- QR personalizado: una fila por restaurante con la configuración de
-- diseño del QR (función exclusiva del plan Enterprise). El logo en sí
-- vive en disco (uploads/qr/), aquí solo se guarda la URL.
-- =====================================================================

CREATE TABLE qr_personalizacion (
  id_restaurante      int          PRIMARY KEY REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  modo                varchar(10)  NOT NULL DEFAULT 'classic'
                       CHECK (modo IN ('classic', 'color', 'halftone')),
  colores             jsonb        NOT NULL DEFAULT '{"puntos": "#0B1C30", "fondo": "#FFFFFF"}'::jsonb
                       CHECK (jsonb_typeof(colores) = 'object'),
  sensibilidad        int          NOT NULL DEFAULT 128 CHECK (sensibilidad BETWEEN 0 AND 255),
  logo_url            text,
  fecha_actualizacion timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_qr_personalizacion_fecha
  BEFORE UPDATE ON qr_personalizacion
  FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();
