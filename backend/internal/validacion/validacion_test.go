package validacion

import (
	"strings"
	"testing"
)

type productoPrueba struct {
	Nombre      string  `json:"nombre" binding:"required,min=2,max=150"`
	Descripcion *string `json:"descripcion" binding:"omitempty,max=500"`
	Precio      float64 `json:"precio" binding:"min=0.1,max=9999.99,dosdecimales"`
}

type registroPrueba struct {
	Correo     string  `json:"correo" binding:"required,email,max=150"`
	Contrasena string  `json:"contrasena" binding:"required,min=8,max=72,contrasena" trim:"no"`
	Telefono   *string `json:"telefono" binding:"omitempty,telefono"`
}

func TestLeer(t *testing.T) {
	Registrar()

	casos := []struct {
		nombre  string
		json    string
		obj     func() any
		mensaje string // vacío = válido
	}{
		{"producto válido", `{"nombre":"  Lomo saltado ","precio":25.5}`, func() any { return &productoPrueba{} }, ""},
		{"nombre solo espacios", `{"nombre":"   ","precio":10}`, func() any { return &productoPrueba{} }, "El nombre es obligatorio"},
		{"nombre largo", `{"nombre":"` + strings.Repeat("a", 151) + `","precio":10}`, func() any { return &productoPrueba{} }, "El nombre puede tener como máximo 150 caracteres"},
		{"precio cero", `{"nombre":"Agua","precio":0}`, func() any { return &productoPrueba{} }, "El precio debe ser al menos S/ 0.10"},
		{"precio enorme", `{"nombre":"Caro","precio":99999999}`, func() any { return &productoPrueba{} }, "El precio no puede ser mayor a S/ 9,999.99"},
		{"tres decimales", `{"nombre":"Pan","precio":1.555}`, func() any { return &productoPrueba{} }, "El precio puede tener como máximo 2 decimales"},
		{"precio como texto", `{"nombre":"Pan","precio":"diez"}`, func() any { return &productoPrueba{} }, "El precio tiene un formato inválido"},
		{"JSON roto", `{"nombre":`, func() any { return &productoPrueba{} }, "los datos enviados no tienen un formato válido"},
		{"correo inválido", `{"correo":"hola","contrasena":"abc12345"}`, func() any { return &registroPrueba{} }, "El correo no es válido"},
		{"contraseña sin número", `{"correo":"a@b.pe","contrasena":"abcdefgh"}`, func() any { return &registroPrueba{} }, "La contraseña debe tener al menos una letra y un número"},
		{"contraseña corta", `{"correo":"a@b.pe","contrasena":"ab1"}`, func() any { return &registroPrueba{} }, "La contraseña debe tener al menos 8 caracteres"},
		{"teléfono inválido", `{"correo":"a@b.pe","contrasena":"abc12345","telefono":"12ab"}`, func() any { return &registroPrueba{} }, "El teléfono debe tener 9 dígitos y empezar con 9"},
		{"teléfono vacío es opcional", `{"correo":"a@b.pe","contrasena":"abc12345","telefono":"  "}`, func() any { return &registroPrueba{} }, ""},
		{"registro válido", `{"correo":"a@b.pe","contrasena":" abc12345 ","telefono":"993043112"}`, func() any { return &registroPrueba{} }, ""},
	}

	for _, c := range casos {
		obj := c.obj()
		err := Leer(strings.NewReader(c.json), obj)
		switch {
		case c.mensaje == "" && err != nil:
			t.Errorf("%s: se esperaba válido, obtuve %q", c.nombre, err)
		case c.mensaje != "" && (err == nil || err.Error() != c.mensaje):
			t.Errorf("%s: se esperaba %q, obtuve %v", c.nombre, c.mensaje, err)
		}
	}
}

func TestLeerRecorta(t *testing.T) {
	Registrar()

	var p productoPrueba
	if err := Leer(strings.NewReader(`{"nombre":"  Ceviche  ","descripcion":"   ","precio":30}`), &p); err != nil {
		t.Fatal(err)
	}
	if p.Nombre != "Ceviche" {
		t.Errorf("nombre = %q, se esperaba recortado", p.Nombre)
	}
	if p.Descripcion != nil {
		t.Errorf("descripción vacía debería quedar en nil, quedó %q", *p.Descripcion)
	}

	var r registroPrueba
	if err := Leer(strings.NewReader(`{"correo":"a@b.pe","contrasena":" abc12345 "}`), &r); err != nil {
		t.Fatal(err)
	}
	if r.Contrasena != " abc12345 " {
		t.Errorf("la contraseña no debe recortarse, quedó %q", r.Contrasena)
	}
}
