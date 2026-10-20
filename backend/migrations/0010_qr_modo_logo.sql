-- Nuevo modo "logo": el logo real sobre una placa blanca al centro (el
-- único que sirve para isotipos con texto/letras, que a resolución de QR no
-- se pueden "dibujar" con puntos recoloreados de forma legible).

ALTER TABLE qr_personalizacion DROP CONSTRAINT qr_personalizacion_modo_check;

ALTER TABLE qr_personalizacion
  ADD CONSTRAINT qr_personalizacion_modo_check
  CHECK (modo IN ('classic', 'color', 'halftone', 'logo'));
