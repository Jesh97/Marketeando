-- Crea un menú y su borrador (vía trigger) para cada local que aún no tenga
-- uno asignado (creados antes de que local.Create auto-creara el menú).
DO $$
DECLARE
  r RECORD;
  v_id_menu int;
BEGIN
  FOR r IN
    SELECT l.id_local, l.id_restaurante, l.nombre
    FROM local l
    WHERE l.id_menu IS NULL AND l.activo
    ORDER BY l.id_local
  LOOP
    INSERT INTO menu (id_restaurante, nombre, es_principal)
    VALUES (r.id_restaurante, r.nombre, false)
    RETURNING id_menu INTO v_id_menu;

    UPDATE local SET id_menu = v_id_menu WHERE id_local = r.id_local;
  END LOOP;
END $$;
