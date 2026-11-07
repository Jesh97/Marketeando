-- Paywall: cada plan define cuántos platos activos admite. El plan gratuito
-- queda en 15; 9999 significa "sin límite" (igual que max_menu en Enterprise).
ALTER TABLE plan
  ADD COLUMN max_producto int NOT NULL DEFAULT 9999 CHECK (max_producto > 0);

UPDATE plan SET max_producto = 15 WHERE precio = 0;

-- Se agrega al final: CREATE OR REPLACE VIEW no permite reordenar columnas.
CREATE OR REPLACE VIEW v_plan_restaurante AS
SELECT s.id_restaurante,
       s.id_suscripcion,
       p.id_plan,
       p.nombre AS plan,
       p.max_menu,
       p.max_local,
       s.fecha_fin,
       s.renueva_en,
       p.max_producto
FROM suscripcion s
JOIN plan p ON p.id_plan = s.id_plan
WHERE s.estado = 'activa';

-- Métrica "Tráfico por marca de agua": un registro por cada clic en el enlace
-- que aparece al pie de las cartas del plan gratuito.
CREATE TABLE clic_marca_agua (
  id_clic         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante  int         NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  fecha           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_clic_marca_agua_restaurante_fecha ON clic_marca_agua (id_restaurante, fecha DESC);
