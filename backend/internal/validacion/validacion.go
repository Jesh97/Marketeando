// Package validacion centraliza cómo el backend lee y valida los JSON que
// llegan del frontend, y cómo explica los errores al usuario: siempre en
// español y sin detalles técnicos (nada de "Key: 'x' Error:Field validation"
// ni "SQLSTATE 22001").
//
// Las reglas se declaran en los structs de cada handler con el tag
// `binding` (las de go-playground/validator más las propias de abajo) y
// deben coincidir con frontend/src/lib/validaciones.js.
package validacion

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var (
	reTelefono   = regexp.MustCompile(`^9\d{8}$`)
	reSubdominio = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$`)
	reLetra      = regexp.MustCompile(`\pL`)
	reNumero     = regexp.MustCompile(`\d`)
	reHora       = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
)

// Registrar añade las reglas propias al validador de gin. Se llama una vez
// al arrancar, antes de registrar las rutas.
func Registrar() {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}

	// En los mensajes se usa el nombre del campo en el JSON ("precio"), no
	// el del struct de Go ("Precio").
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		nombre, _, _ := strings.Cut(f.Tag.Get("json"), ",")
		if nombre == "-" || nombre == "" {
			return f.Name
		}
		return nombre
	})

	reglas := map[string]validator.Func{
		// Celular peruano: 9 dígitos empezando con 9.
		"telefono": func(fl validator.FieldLevel) bool { return reTelefono.MatchString(fl.Field().String()) },
		// Mismo formato que ck_restaurante_subdominio_formato en la base de datos.
		"subdominio": func(fl validator.FieldLevel) bool { return reSubdominio.MatchString(fl.Field().String()) },
		"contrasena": func(fl validator.FieldLevel) bool {
			s := fl.Field().String()
			return reLetra.MatchString(s) && reNumero.MatchString(s)
		},
		"hora": func(fl validator.FieldLevel) bool { return reHora.MatchString(fl.Field().String()) },
		// Montos en soles: como mucho 2 decimales (S/ 12.50, no S/ 12.505).
		"dosdecimales": func(fl validator.FieldLevel) bool {
			centimos := fl.Field().Float() * 100
			return abs(centimos-float64(int64(centimos+0.5))) < 1e-6
		},
	}
	for tag, fn := range reglas {
		_ = v.RegisterValidation(tag, fn)
	}
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

// Leer decodifica el JSON del body en obj, recorta espacios de todos sus
// textos (un nombre "   " cuenta como vacío) y valida las reglas `binding`.
// Devuelve un error con un mensaje listo para mostrar al usuario.
func Leer(body io.Reader, obj any) error {
	if err := json.NewDecoder(body).Decode(obj); err != nil {
		var tipo *json.UnmarshalTypeError
		if errors.As(err, &tipo) {
			return fmt.Errorf("%s tiene un formato inválido", etiqueta(tipo.Field))
		}
		return errors.New("los datos enviados no tienen un formato válido")
	}

	recortar(reflect.ValueOf(obj))

	if err := binding.Validator.ValidateStruct(obj); err != nil {
		var errs validator.ValidationErrors
		if errors.As(err, &errs) && len(errs) > 0 {
			return errors.New(Mensaje(errs[0]))
		}
		return errors.New("los datos enviados no son válidos")
	}
	return nil
}

// recortar aplica strings.TrimSpace a cada campo de texto del struct. Los
// *string que quedan vacíos pasan a nil (el campo opcional se borra), y los
// campos con `trim:"no"` (contraseñas) se dejan tal cual.
func recortar(v reflect.Value) {
	if v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return
	}

	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		campo, tipo := v.Field(i), t.Field(i)
		if !tipo.IsExported() || tipo.Tag.Get("trim") == "no" {
			continue
		}
		switch {
		case campo.Kind() == reflect.String:
			campo.SetString(strings.TrimSpace(campo.String()))
		case campo.Kind() == reflect.Pointer && !campo.IsNil() && campo.Elem().Kind() == reflect.String:
			if s := strings.TrimSpace(campo.Elem().String()); s == "" {
				campo.Set(reflect.Zero(campo.Type()))
			} else {
				campo.Elem().SetString(s)
			}
		case campo.Kind() == reflect.Slice && campo.Type().Elem().Kind() == reflect.String:
			for j := 0; j < campo.Len(); j++ {
				campo.Index(j).SetString(strings.TrimSpace(campo.Index(j).String()))
			}
		case campo.Kind() == reflect.Struct:
			recortar(campo.Addr())
		}
	}
}

// Nombres de los campos tal como se le muestran al usuario, con artículo
// para armar frases como "El nombre es obligatorio".
var etiquetas = map[string]string{
	"correo":           "El correo",
	"contrasena":       "La contraseña",
	"nombre":           "El nombre",
	"title":            "El título",
	"subdominio":       "La dirección de tu carta",
	"slogan":           "El eslogan",
	"telefono":         "El teléfono",
	"direccion":        "La dirección",
	"descripcion":      "La descripción",
	"precio":           "El precio",
	"slug":             "El enlace del local",
	"titular":          "El nombre del titular",
	"plantilla":        "La plantilla",
	"horario_texto":    "El horario",
	"horario_desde":    "La hora de apertura",
	"horario_hasta":    "La hora de cierre",
	"horario_dias":     "Los días de atención",
	"url_imagen":       "La imagen",
	"id_plan":          "El plan",
	"metodo_pago":      "El método de pago",
	"codigo_seguridad": "El código de seguridad",
}

func etiqueta(campo string) string {
	if e, ok := etiquetas[campo]; ok {
		return e
	}
	if campo == "" {
		return "Un dato"
	}
	return "El campo " + campo
}

// Mensaje traduce un error del validador a una frase para el usuario.
func Mensaje(fe validator.FieldError) string {
	campo := fe.Field()
	e := etiqueta(campo)
	esTexto := fe.Kind() == reflect.String

	switch fe.Tag() {
	case "required":
		return e + " es obligatorio"
	case "email":
		return "El correo no es válido"
	case "telefono":
		return "El teléfono debe tener 9 dígitos y empezar con 9"
	case "subdominio":
		return "La dirección de tu carta debe tener de 3 a 40 caracteres: solo minúsculas, números y guiones (sin guion al inicio o al final)"
	case "contrasena":
		return "La contraseña debe tener al menos una letra y un número"
	case "hora":
		return e + " debe tener el formato HH:MM"
	case "dosdecimales":
		return e + " puede tener como máximo 2 decimales"
	case "url":
		return e + " no es una dirección web válida"
	case "oneof":
		return e + " no es válido"
	case "min", "gte":
		if esTexto {
			return fmt.Sprintf("%s debe tener al menos %s caracteres", e, fe.Param())
		}
		if campo == "precio" {
			return "El precio debe ser al menos S/ " + formatoSoles(fe.Param())
		}
		return fmt.Sprintf("%s debe ser al menos %s", e, fe.Param())
	case "max", "lte":
		if esTexto {
			return fmt.Sprintf("%s puede tener como máximo %s caracteres", e, fe.Param())
		}
		if fe.Kind() == reflect.Slice {
			return fmt.Sprintf("%s puede tener como máximo %s elementos", e, fe.Param())
		}
		if campo == "precio" {
			return "El precio no puede ser mayor a S/ " + formatoSoles(fe.Param())
		}
		return fmt.Sprintf("%s no puede ser mayor a %s", e, fe.Param())
	}
	return e + " no es válido"
}

func formatoSoles(param string) string {
	var f float64
	if _, err := fmt.Sscan(param, &f); err != nil {
		return param
	}
	entero := fmt.Sprintf("%.2f", f)
	ent, dec, _ := strings.Cut(entero, ".")
	// Separador de miles: 9999.99 -> 9,999.99
	var b strings.Builder
	for i, r := range ent {
		if i > 0 && (len(ent)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	return b.String() + "." + dec
}
