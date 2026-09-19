package models

import (
	"encoding/json"
	"time"
)

type Menu struct {
	IDMenu             int       `json:"id_menu"`
	IDRestaurante      int       `json:"id_restaurante"`
	Nombre             string    `json:"nombre"`
	EsPrincipal        bool      `json:"es_principal"`
	Activo             bool      `json:"activo"`
	FechaCreacion      time.Time `json:"fecha_creacion"`
	FechaActualizacion time.Time `json:"fecha_actualizacion"`
}

type MenuVersion struct {
	IDVersion          int             `json:"id_version"`
	IDMenu             int             `json:"id_menu"`
	Numero             int             `json:"numero"`
	Estado             string          `json:"estado"`
	Contenido          json.RawMessage `json:"contenido"`
	FechaCreacion      time.Time       `json:"fecha_creacion"`
	FechaActualizacion time.Time       `json:"fecha_actualizacion"`
	FechaPublicacion   *time.Time      `json:"fecha_publicacion"`
}
