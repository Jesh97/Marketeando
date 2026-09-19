package models

import "time"

type Producto struct {
	IDProducto         int       `json:"id_producto"`
	IDRestaurante      int       `json:"id_restaurante"`
	IDCategoria        *int      `json:"id_categoria"`
	Nombre             string    `json:"nombre"`
	Descripcion        *string   `json:"descripcion"`
	Precio             float64   `json:"precio"`
	URLImagen          *string   `json:"url_imagen"`
	Activo             bool      `json:"activo"`
	Agotado            bool      `json:"agotado"`
	FechaRegistro      time.Time `json:"fecha_registro"`
	FechaActualizacion time.Time `json:"fecha_actualizacion"`
}
