-- Vincula cada diseño del editor visual al menú (carta) para el que se hizo,
-- así cada local/sucursal lista solo sus propios diseños (ver
-- EditorHandler.List con ?id_menu=N). Es opcional: los documentos creados
-- antes quedan con NULL y siguen apareciendo en el listado general. Si se
-- borra el menú, el diseño no se pierde, solo queda desvinculado.
ALTER TABLE editor_documents
  ADD COLUMN IF NOT EXISTS id_menu int REFERENCES menu (id_menu) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_editor_documents_menu ON editor_documents (id_usuario, id_menu, updated_at DESC);
