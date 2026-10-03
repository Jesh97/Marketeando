package handlers

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

var subdominiosReservados = map[string]bool{
	"www": true, "app": true, "api": true, "admin": true, "mail": true, "static": true,
	"assets": true, "cdn": true, "dashboard": true, "panel": true, "ftp": true, "smtp": true,
	"blog": true, "ayuda": true, "soporte": true, "docs": true, "status": true, "login": true,
	"registro": true,
}

var reemplazoAcentos = strings.NewReplacer(
	"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n",
)

// slugifyBase convierte un nombre libre (ej. "María José") en una base de
// subdominio válida según ck_restaurante_subdominio_formato (minúsculas,
// números y guiones, sin guion al inicio/final, 3 a 40 caracteres).
func slugifyBase(nombre string) string {
	s := reemplazoAcentos.Replace(strings.ToLower(strings.TrimSpace(nombre)))

	var b strings.Builder
	prevGuion := true // evita que el slug empiece con guion
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			prevGuion = false
		case !prevGuion:
			b.WriteByte('-')
			prevGuion = true
		}
	}

	slug := strings.Trim(b.String(), "-")
	if len(slug) > 30 {
		slug = strings.Trim(slug[:30], "-")
	}
	if len(slug) < 3 || subdominiosReservados[slug] {
		slug = "restaurante"
	}
	return slug
}

// generarSubdominioUnico prueba <base>, <base>-2, <base>-3... dentro de la
// transacción hasta encontrar uno libre. El índice único de la tabla sigue
// siendo la garantía final ante una carrera entre transacciones concurrentes.
func generarSubdominioUnico(ctx context.Context, tx pgx.Tx, base string) (string, error) {
	for i := 1; i <= 50; i++ {
		candidato := base
		if i > 1 {
			sufijo := fmt.Sprintf("-%d", i)
			b := base
			if max := 40 - len(sufijo); len(b) > max {
				b = strings.Trim(b[:max], "-")
			}
			candidato = b + sufijo
		}

		var existe bool
		if err := tx.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM restaurante WHERE subdominio = $1)", candidato,
		).Scan(&existe); err != nil {
			return "", err
		}
		if !existe {
			return candidato, nil
		}
	}
	return "", fmt.Errorf("no se pudo generar un subdominio único a partir de %q", base)
}
