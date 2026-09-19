package models

import "time"

type Suscripcion struct {
	IDSuscripcion int        `json:"id_suscripcion"`
	IDRestaurante int        `json:"id_restaurante"`
	IDPlan        int        `json:"id_plan"`
	Plan          string     `json:"plan"`
	MetodoPago    string     `json:"metodo_pago"`
	Estado        string     `json:"estado"`
	FechaInicio   time.Time  `json:"fecha_inicio"`
	FechaFin      time.Time  `json:"fecha_fin"`
	RenuevaEn     *time.Time `json:"renueva_en"`
}
