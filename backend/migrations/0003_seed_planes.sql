-- Planes alineados con la landing/checkout del frontend (Básico gratis con
-- 1 menú, Pro $19/mes "ilimitado" -> tope alto en la práctica, Enterprise
-- $49/mes con múltiples locales). Ajusta libremente desde /subscription
-- cuando el negocio defina precios finales.
INSERT INTO plan (nombre, precio, max_menu, max_local) VALUES
  ('Básico',     0.00, 1,    1),
  ('Pro',       19.00, 9999, 5),
  ('Enterprise', 49.00, 9999, 9999)
ON CONFLICT (nombre) DO NOTHING;
