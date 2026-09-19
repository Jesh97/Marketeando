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

// EditorDocumentSummary se usa en el listado: evita mandar data_json/html_content
// completos (pueden pesar bastante) solo para mostrar tarjetas.
type EditorDocumentSummary struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
