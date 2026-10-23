package validacion

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Mensajes para las restricciones de la base de datos que un usuario puede
// llegar a tocar (el resto cae en un mensaje genérico).
var mensajesRestriccion = map[string]string{
	"uq_usuario_correo":                   "Ya existe una cuenta con ese correo",
	"uq_restaurante_subdominio":           "Esa dirección de carta ya está en uso, prueba con otra",
	"ck_restaurante_subdominio_formato":   "La dirección de tu carta debe tener de 3 a 40 caracteres: solo minúsculas, números y guiones",
	"ck_restaurante_subdominio_reservado": "Esa dirección de carta está reservada, prueba con otra",
	"ck_restaurante_telefono":             "El teléfono debe tener 9 dígitos y empezar con 9",
	"ck_local_telefono":                   "El teléfono debe tener 9 dígitos y empezar con 9",
	"uq_local_slug":                       "Ya tienes un local con ese enlace",
	"ck_local_slug":                       "El enlace del local solo puede tener minúsculas, números y guiones",
	"ux_categoria_nombre":                 "Ya tienes una categoría con ese nombre",
	"ux_menu_nombre":                      "Ya tienes un menú con ese nombre",
	"fk_producto_categoria":               "La categoría elegida no existe",
}

// ErrorBD convierte un error de la base de datos en un código HTTP y un
// mensaje para el usuario. Los errores que no reconoce son 500 con un
// mensaje genérico: el detalle técnico solo debe ir al log del servidor.
func ErrorBD(err error) (int, string) {
	if errors.Is(err, pgx.ErrNoRows) {
		return http.StatusNotFound, "No se encontró lo que buscas"
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return http.StatusInternalServerError, "Ocurrió un error inesperado, intenta de nuevo"
	}

	if msg, ok := mensajesRestriccion[pgErr.ConstraintName]; ok {
		status := http.StatusBadRequest
		if pgErr.Code == "23505" {
			status = http.StatusConflict
		}
		return status, msg
	}

	switch pgErr.Code {
	case "23505": // unique_violation
		return http.StatusConflict, "Ese dato ya está registrado"
	case "23503": // foreign_key_violation
		return http.StatusBadRequest, "Uno de los datos hace referencia a algo que no existe"
	case "23514", "23502": // check_violation, not_null_violation
		return http.StatusBadRequest, "Algún dato no tiene el formato permitido"
	case "22001": // string_data_right_truncation
		return http.StatusBadRequest, "Uno de los textos es demasiado largo"
	case "22003", "22P02": // numeric_value_out_of_range, invalid_text_representation
		return http.StatusBadRequest, "Uno de los valores está fuera del rango permitido"
	}
	return http.StatusInternalServerError, "Ocurrió un error inesperado, intenta de nuevo"
}
