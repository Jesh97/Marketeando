package models

import "time"

type MetodoPago struct {
	IDRestaurante int       `json:"id_restaurante"`
	Tipo          string    `json:"tipo"`
	Titular       *string   `json:"titular"`
	Marca         *string   `json:"marca"`
	Ultimos4      *string   `json:"ultimos4"`
	Vencimiento   *string   `json:"vencimiento"`
	ActualizadoEn time.Time `json:"actualizado_en"`
}
