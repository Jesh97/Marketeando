package models

type Plan struct {
	IDPlan   int     `json:"id_plan"`
	Nombre   string  `json:"nombre"`
	Precio   float64 `json:"precio"`
	MaxMenu  int     `json:"max_menu"`
	MaxLocal int     `json:"max_local"`
	Activo   bool    `json:"activo"`
}
