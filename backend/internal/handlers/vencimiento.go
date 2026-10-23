package handlers

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// diasGraciaVencimiento: días extra que conserva un plan pagado después de
// su fecha_fin para que el restaurante alcance a renovar con Yape.
const diasGraciaVencimiento = 3

// VencerSuscripciones pasa a 'vencida' toda suscripción pagada cuyo periodo
// (más los días de gracia) ya terminó, y deja al restaurante en el plan
// gratuito para que su carta siga publicada con los límites de Básico. Los
// datos (menús, locales, productos) no se tocan.
func VencerSuscripciones(ctx context.Context, db *pgxpool.Pool) (int64, error) {
	tag, err := db.Exec(ctx,
		`WITH vencidas AS (
		   UPDATE suscripcion s SET estado = 'vencida'
		   FROM plan p
		   WHERE p.id_plan = s.id_plan AND p.precio > 0 AND s.estado = 'activa'
		     AND s.fecha_fin + make_interval(days => $1) < now()
		   RETURNING s.id_restaurante
		 ), gratis AS (
		   SELECT id_plan FROM plan WHERE precio = 0 AND activo ORDER BY id_plan LIMIT 1
		 )
		 INSERT INTO suscripcion (id_restaurante, id_plan, metodo_pago, estado, fecha_inicio, fecha_fin)
		 SELECT v.id_restaurante, g.id_plan, 'yape', 'activa', now(), now() + interval '1 month'
		 FROM vencidas v CROSS JOIN gratis g`,
		diasGraciaVencimiento,
	)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// IniciarVencimientos corre VencerSuscripciones al arrancar y luego cada hora.
func IniciarVencimientos(ctx context.Context, db *pgxpool.Pool) {
	revisar := func() {
		n, err := VencerSuscripciones(ctx, db)
		if err != nil {
			log.Printf("vencimientos: %v", err)
		} else if n > 0 {
			log.Printf("vencimientos: %d suscripción(es) vencida(s) pasaron al plan gratuito", n)
		}
	}

	go func() {
		revisar()
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				revisar()
			}
		}
	}()
}
