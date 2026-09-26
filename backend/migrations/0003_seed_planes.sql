-- Planes alineados con la landing/checkout del frontend: Básico gratis con
-- 1 menú y 1 local, Pro $19/mes con 2 menús y 2 locales (además desbloquea
-- las plantillas del editor visual, ver TEMPLATES en el frontend), Enterprise
-- $49/mes sin límite práctico. Ajusta libremente desde /subscription cuando
-- el negocio defina precios finales.
INSERT INTO plan (nombre, precio, max_menu, max_local) VALUES
  ('Básico',     0.00, 1,    1),
  ('Pro',       19.00, 2,    2),
  ('Enterprise', 49.00, 9999, 9999)
ON CONFLICT (nombre) DO NOTHING;
