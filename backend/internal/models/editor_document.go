package models

import (
	"encoding/json"
	"time"
)

type EditorDocument struct {
	ID          int             `json:"id"`
	IDUsuario   int             `json:"id_usuario"`
	Title       string          `json:"title"`
	DataJSON    json.RawMessage `json:"data_json"`
	HTMLContent string          `json:"html_content"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// EditorDocumentSummary se usa en el listado: incluye data_json (para pintar
// una miniatura de cada tarjeta) pero no html_content, que es más pesado y
// redundante ya que el frontend puede generar el HTML a partir de data_json.
type EditorDocumentSummary struct {
	ID        int             `json:"id"`
	Title     string          `json:"title"`
	DataJSON  json.RawMessage `json:"data_json"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}
