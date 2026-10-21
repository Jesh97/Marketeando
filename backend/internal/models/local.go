package models

import (
	"encoding/json"
	"time"
)

type Local struct {
	IDLocal       int              `json:"id_local"`
	IDRestaurante int              `json:"id_restaurante"`
	IDMenu        *int             `json:"id_menu"`
	Nombre        string           `json:"nombre"`
	Slug          string           `json:"slug"`
	Direccion     *string          `json:"direccion"`
	Telefono      *string          `json:"telefono"`
	Horario       *json.RawMessage `json:"horario"`
	Activo        bool             `json:"activo"`
	FechaRegistro time.Time        `json:"fecha_registro"`
}
