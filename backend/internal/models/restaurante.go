package models

import "time"

type Restaurante struct {
	IDRestaurante     int       `json:"id_restaurante"`
	IDUsuario         int       `json:"id_usuario"`
	IDTipoRestaurante *int      `json:"id_tipo_restaurante"`
	Nombre            string    `json:"nombre"`
	Subdominio        string    `json:"subdominio"`
	Slogan            *string   `json:"slogan"`
	URLLogo           *string   `json:"url_logo"`
	Telefono          *string   `json:"telefono"`
	ZonaHoraria       string    `json:"zona_horaria"`
	Plantilla         string    `json:"plantilla"`
	Activo            bool      `json:"activo"`
	FechaRegistro     time.Time `json:"fecha_registro"`
}
