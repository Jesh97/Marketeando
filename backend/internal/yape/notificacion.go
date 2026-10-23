// Package yape interpreta el texto de las notificaciones push de Yape que
// reenvía el script del celular (ver scripts/yape_notificaciones.py). Yape no
// tiene API para cuentas personales, así que el texto de la notificación es
// la única fuente: si Yape cambia su redacción, se ajusta solo este archivo.
package yape

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Pago es lo que se puede sacar de una notificación de pago recibido.
type Pago struct {
	Remitente       string // tal como lo muestra Yape, abreviado ("Lennin San*")
	MontoCentimos   int64
	CodigoSeguridad string // 3 dígitos; vacío si la notificación no lo trae
}

// Monto devuelve el monto como texto decimal ("75.37"), listo para comparar
// contra una columna numeric sin pasar por float.
func (p Pago) Monto() string {
	return fmt.Sprintf("%d.%02d", p.MontoCentimos/100, p.MontoCentimos%100)
}

// Ejemplo real: "Lennin San* te envió un pago por S/ 5. El cód. de seguridad es: 459"
var (
	rePago   = regexp.MustCompile(`^\s*(.+?)\s+te envi[oó] un pago por S/\s*([0-9][0-9.,]*)`)
	reCodigo = regexp.MustCompile(`(?i)c[oó]d(?:igo|\.)?\s+de\s+seguridad\s+es:?\s*(\d{3,6})`)
)

// Parsear devuelve ok=false si el texto no es una notificación de pago
// recibido (por ejemplo promociones o avisos de la app).
func Parsear(texto string) (Pago, bool) {
	m := rePago.FindStringSubmatch(texto)
	if m == nil {
		return Pago{}, false
	}

	centimos, ok := parsearMonto(m[2])
	if !ok || centimos <= 0 {
		return Pago{}, false
	}

	p := Pago{Remitente: strings.TrimSpace(m[1]), MontoCentimos: centimos}
	if c := reCodigo.FindStringSubmatch(texto); c != nil {
		p.CodigoSeguridad = c[1]
	}
	return p, true
}

// parsearMonto acepta "5", "5.", "5.5", "75.37", "1,234.50" y, por si acaso,
// la coma decimal "75,37". Trabaja en céntimos para no arrastrar errores de
// float al comparar montos.
func parsearMonto(raw string) (int64, bool) {
	s := strings.TrimRight(raw, ".,")

	if !strings.Contains(s, ".") && regexp.MustCompile(`^\d+,\d{1,2}$`).MatchString(s) {
		s = strings.Replace(s, ",", ".", 1)
	}
	s = strings.ReplaceAll(s, ",", "")

	entero, decimales, _ := strings.Cut(s, ".")
	if entero == "" || len(decimales) > 2 || strings.Contains(decimales, ".") {
		return 0, false
	}
	for len(decimales) < 2 {
		decimales += "0"
	}

	soles, err := strconv.ParseInt(entero, 10, 64)
	if err != nil {
		return 0, false
	}
	cent, err := strconv.ParseInt(decimales, 10, 64)
	if err != nil {
		return 0, false
	}
	return soles*100 + cent, true
}
