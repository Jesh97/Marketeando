package models

import "time"

type Usuario struct {
	IDUsuario     int       `json:"id_usuario"`
	Correo        string    `json:"correo"`
	Nombre        string    `json:"nombre"`
	Activo        bool      `json:"activo"`
	FechaRegistro time.Time `json:"fecha_registro"`
}
