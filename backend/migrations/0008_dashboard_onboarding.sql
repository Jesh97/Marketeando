ALTER TABLE restaurante
  ADD COLUMN design_customized_at timestamptz,
  ADD COLUMN qr_downloaded_at timestamptz;
