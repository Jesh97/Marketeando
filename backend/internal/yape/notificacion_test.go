package yape

import "testing"

func TestParsear(t *testing.T) {
	casos := []struct {
		texto     string
		ok        bool
		remitente string
		monto     string
		codigo    string
	}{
		// Texto real de una notificación (captura del 2026-10-21).
		{"Lennin San* te envió un pago por S/ 5. El cód. de seguridad es: 459", true, "Lennin San*", "5.00", "459"},
		{"Maria Lop* te envió un pago por S/ 75.37. El cód. de seguridad es: 071", true, "Maria Lop*", "75.37", "071"},
		{"Ana Q* te envió un pago por S/ 190.5. El cód. de seguridad es: 123", true, "Ana Q*", "190.50", "123"},
		{"Ana Q* te envió un pago por S/ 1,234.50. El cód. de seguridad es: 123", true, "Ana Q*", "1234.50", "123"},
		{"Ana Q* te envió un pago por S/ 75,37. El cód. de seguridad es: 123", true, "Ana Q*", "75.37", "123"},
		{"Ana Q* te envió un pago por S/ 10", true, "Ana Q*", "10.00", ""},
		{"¡Yapea y gana! Participa en el sorteo", false, "", "", ""},
		{"Ana Q* te envió un pago por S/ 0. El cód. de seguridad es: 123", false, "", "", ""},
	}

	for _, c := range casos {
		p, ok := Parsear(c.texto)
		if ok != c.ok {
			t.Errorf("%q: ok = %v, se esperaba %v", c.texto, ok, c.ok)
			continue
		}
		if !ok {
			continue
		}
		if p.Remitente != c.remitente || p.Monto() != c.monto || p.CodigoSeguridad != c.codigo {
			t.Errorf("%q: obtuve (%q, %s, %q), se esperaba (%q, %s, %q)",
				c.texto, p.Remitente, p.Monto(), p.CodigoSeguridad, c.remitente, c.monto, c.codigo)
		}
	}
}
