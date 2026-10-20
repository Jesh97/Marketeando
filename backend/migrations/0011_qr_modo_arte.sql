-- Nuevo modo "arte": el logo a todo color ocupa todo el QR y cada módulo
-- se dibuja como un punto encima (oscuro o claro según el dato), con ojos
-- circulares. Sus ajustes finos (tamaño de punto, intensidad del logo) y la
-- fracción del modo "logo" se guardan en `ajustes` para que el Dashboard
-- reconstruya exactamente el mismo diseño que se validó al guardar.

ALTER TABLE qr_personalizacion DROP CONSTRAINT qr_personalizacion_modo_check;

ALTER TABLE qr_personalizacion
  ADD CONSTRAINT qr_personalizacion_modo_check
  CHECK (modo IN ('classic', 'color', 'halftone', 'logo', 'arte'));

ALTER TABLE qr_personalizacion
  ADD COLUMN ajustes jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(ajustes) = 'object');
