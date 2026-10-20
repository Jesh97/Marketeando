package models

import (
	"encoding/json"
	"time"
)

type QRPersonalizacion struct {
	IDRestaurante      int             `json:"id_restaurante"`
	Modo               string          `json:"modo"`
	Colores            json.RawMessage `json:"colores"`
	Sensibilidad       int             `json:"sensibilidad"`
	Ajustes            json.RawMessage `json:"ajustes"`
	LogoURL            *string         `json:"logo_url"`
	FechaActualizacion time.Time       `json:"fecha_actualizacion"`
}
