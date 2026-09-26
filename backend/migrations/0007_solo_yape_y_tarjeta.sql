-- La app ahora solo acepta Yape o Tarjeta como método de pago (antes también
-- se listaban Plin, Transferencia y Otro). Las suscripciones gratis (plan
-- Básico) que quedaron con 'otro' del registro automático (ver
-- AuthHandler.Registro) se migran a 'yape' porque no cobran nada real de
-- todos modos; ajusta manualmente si necesitas otro valor real.
UPDATE suscripcion SET metodo_pago = 'yape' WHERE metodo_pago NOT IN ('tarjeta', 'yape');
UPDATE metodo_pago_guardado SET tipo = 'yape' WHERE tipo NOT IN ('tarjeta', 'yape');

ALTER TABLE suscripcion DROP CONSTRAINT suscripcion_metodo_pago_check;
ALTER TABLE suscripcion ADD CONSTRAINT suscripcion_metodo_pago_check
  CHECK (metodo_pago IN ('tarjeta', 'yape'));

ALTER TABLE metodo_pago_guardado DROP CONSTRAINT metodo_pago_guardado_tipo_check;
ALTER TABLE metodo_pago_guardado ADD CONSTRAINT metodo_pago_guardado_tipo_check
  CHECK (tipo IN ('tarjeta', 'yape'));
