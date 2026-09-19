-- =====================================================================
--  Editor visual (estilo Canva): documentos de diseño libre
--  (texto, formas e imágenes posicionados libremente en un lienzo).
--
--  Cada documento pertenece a un usuario. data_json guarda el estado
--  editable (capas); html_content guarda la compilación a HTML/CSS
--  autosuficiente (ya sanitizada en el backend antes de guardarse).
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TABLE editor_documents (
  id            int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario    int          NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  title         varchar(150) NOT NULL DEFAULT 'Sin título',
  data_json     jsonb        NOT NULL DEFAULT '{"canvas":{"width":800,"height":1000,"background":"#ffffff"},"elements":[]}'::jsonb,
  html_content  text         NOT NULL DEFAULT '',
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_editor_documents_json CHECK (jsonb_typeof(data_json) = 'object')
);

CREATE INDEX ix_editor_documents_usuario ON editor_documents (id_usuario, updated_at DESC);

CREATE TRIGGER trg_editor_documents_fecha
  BEFORE UPDATE ON editor_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
