package models

type Categoria struct {
	IDCategoria   int    `json:"id_categoria"`
	IDRestaurante int    `json:"id_restaurante"`
	Nombre        string `json:"nombre"`
	Orden         int    `json:"orden"`
	Activo        bool   `json:"activo"`
}
