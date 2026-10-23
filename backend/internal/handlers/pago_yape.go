package handlers

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/yape"
)

const (
	// Tiempo que tiene el restaurante para yapear desde que abre la pantalla de pago.
	minutosPagoYape = 10
	// Margen para notificaciones que llegan un poco después de expirar (el
	// celular puede tardar en recibirlas o el script en reenviarlas).
	toleranciaNotificacion = 2 * time.Minute
	// Ventana en la que un yapeo sin asignar todavía se puede reclamar.
	ventanaReclamo     = 24 * time.Hour
	maxIntentosReclamo = 5
)

var reCodigoSeguridad = regexp.MustCompile(`^\d{3,6}$`)

type PagoYapeHandler struct {
	DB            *pgxpool.Pool
	Numero        string
	Titular       string
	QRURL         string
	WebhookSecret string
}

func NewPagoYapeHandler(db *pgxpool.Pool, numero, titular, qrURL, webhookSecret string) *PagoYapeHandler {
	return &PagoYapeHandler{DB: db, Numero: numero, Titular: titular, QRURL: qrURL, WebhookSecret: webhookSecret}
}

type pagoYapeRespuesta struct {
	IDPago   int       `json:"id_pago"`
	IDPlan   int       `json:"id_plan"`
	Plan     string    `json:"plan"`
	Monto    float64   `json:"monto"`
	Estado   string    `json:"estado"`
	ExpiraEn time.Time `json:"expira_en"`
	Numero   string    `json:"numero"`
	Titular  string    `json:"titular"`
	QRURL    string    `json:"qr_url"`
}

func (h *PagoYapeHandler) respuesta(ctx context.Context, idPago, idRestaurante int) (*pagoYapeRespuesta, error) {
	r := pagoYapeRespuesta{Numero: h.Numero, Titular: h.Titular, QRURL: h.QRURL}
	err := h.DB.QueryRow(ctx,
		`SELECT py.id_pago, py.id_plan, p.nombre, py.monto,
		        CASE WHEN py.estado = 'esperando' AND py.expira_en < now() THEN 'expirado' ELSE py.estado END,
		        py.expira_en
		 FROM pago_yape py JOIN plan p ON p.id_plan = py.id_plan
		 WHERE py.id_pago = $1 AND py.id_restaurante = $2`,
		idPago, idRestaurante,
	).Scan(&r.IDPago, &r.IDPlan, &r.Plan, &r.Monto, &r.Estado, &r.ExpiraEn)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

type iniciarPagoYapeRequest struct {
	IDPlan int `json:"id_plan" binding:"required"`
}

// Iniciar abre un intento de pago con un monto de céntimos únicos (plan
// S/ 75 -> S/ 75.37) que vence en minutosPagoYape. Cancela cualquier otro
// intento del mismo restaurante que siguiera esperando.
func (h *PagoYapeHandler) Iniciar(c *gin.Context) {
	if h.Numero == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "el pago con Yape no está configurado"})
		return
	}

	var req iniciarPagoYapeRequest
	if !leerJSON(c, &req) {
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	var precio float64
	if err := h.DB.QueryRow(ctx, "SELECT precio FROM plan WHERE id_plan = $1 AND activo", req.IDPlan).Scan(&precio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "el plan indicado no existe"})
		return
	}
	if precio <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "este plan es gratuito, no requiere pago"})
		return
	}

	// Dos solicitudes simultáneas pueden elegir los mismos céntimos: el índice
	// único ux_pago_yape_monto_esperando rechaza la segunda y se reintenta.
	for intento := 0; intento < 3; intento++ {
		idPago, err := h.crearIntento(ctx, idRestaurante, req.IDPlan, precio)
		if errors.Is(err, errSinCentimosLibres) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "hay muchos pagos en curso, intenta de nuevo en unos minutos"})
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue
		}
		if err != nil {
			responderError(c, err)
			return
		}

		r, err := h.respuesta(ctx, idPago, idRestaurante)
		if err != nil {
			responderError(c, err)
			return
		}
		c.JSON(http.StatusCreated, r)
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "no se pudo generar el pago, intenta de nuevo"})
}

var errSinCentimosLibres = errors.New("sin céntimos libres")

func (h *PagoYapeHandler) crearIntento(ctx context.Context, idRestaurante, idPlan int, precio float64) (int, error) {
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`UPDATE pago_yape SET estado = CASE WHEN id_restaurante = $1 THEN 'cancelado' ELSE 'expirado' END
		 WHERE estado = 'esperando' AND (id_restaurante = $1 OR expira_en < now())`,
		idRestaurante,
	); err != nil {
		return 0, err
	}

	// Céntimos ocupados: los que siguen esperando y, para no confundir un
	// yapeo tardío con un pago nuevo, los usados en las últimas 24 horas.
	rows, err := tx.Query(ctx,
		`SELECT DISTINCT round((monto - $1) * 100)::int FROM pago_yape
		 WHERE monto > $1 AND monto < $1 + 1
		   AND (estado = 'esperando' OR creado_en > now() - interval '24 hours')`,
		precio,
	)
	if err != nil {
		return 0, err
	}
	ocupados := map[int]bool{}
	for rows.Next() {
		var cent int
		if err := rows.Scan(&cent); err != nil {
			rows.Close()
			return 0, err
		}
		ocupados[cent] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	libres := []int{}
	for cent := 1; cent <= 99; cent++ {
		if !ocupados[cent] {
			libres = append(libres, cent)
		}
	}
	if len(libres) == 0 {
		// Mucho movimiento en 24 h: basta con que no choque con uno esperando.
		var esperando []int
		if err := tx.QueryRow(ctx,
			`SELECT coalesce(array_agg(round((monto - $1) * 100)::int), '{}') FROM pago_yape
			 WHERE estado = 'esperando' AND monto > $1 AND monto < $1 + 1`,
			precio,
		).Scan(&esperando); err != nil {
			return 0, err
		}
		usados := map[int]bool{}
		for _, cent := range esperando {
			usados[cent] = true
		}
		for cent := 1; cent <= 99; cent++ {
			if !usados[cent] {
				libres = append(libres, cent)
			}
		}
	}
	if len(libres) == 0 {
		return 0, errSinCentimosLibres
	}

	cent := libres[rand.IntN(len(libres))]
	monto := fmt.Sprintf("%d.%02d", int(precio), cent)

	var idPago int
	if err := tx.QueryRow(ctx,
		`INSERT INTO pago_yape (id_restaurante, id_plan, monto, expira_en)
		 VALUES ($1, $2, $3::numeric, now() + make_interval(mins => $4))
		 RETURNING id_pago`,
		idRestaurante, idPlan, monto, minutosPagoYape,
	).Scan(&idPago); err != nil {
		return 0, err
	}

	return idPago, tx.Commit(ctx)
}

// Estado lo consulta el frontend cada pocos segundos mientras muestra el QR.
func (h *PagoYapeHandler) Estado(c *gin.Context) {
	idPago, err := strconv.Atoi(c.Param("id_pago"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_pago inválido"})
		return
	}

	r, err := h.respuesta(c.Request.Context(), idPago, currentRestauranteID(c))
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "pago no encontrado"})
		return
	}
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(http.StatusOK, r)
}

type reclamarPagoYapeRequest struct {
	CodigoSeguridad string `json:"codigo_seguridad" binding:"required"`
}

// Reclamar cubre el yapeo que llegó después de expirar el intento: si existe
// una notificación sin asignar con el mismo monto y el mismo código de
// seguridad (que el restaurante ve en su comprobante de Yape), se asigna a
// este pago y se activa el plan.
func (h *PagoYapeHandler) Reclamar(c *gin.Context) {
	idPago, err := strconv.Atoi(c.Param("id_pago"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_pago inválido"})
		return
	}
	var req reclamarPagoYapeRequest
	if err := c.ShouldBindJSON(&req); err != nil || !reCodigoSeguridad.MatchString(req.CodigoSeguridad) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ingresa el código de seguridad de 3 dígitos de tu comprobante de Yape"})
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		responderError(c, err)
		return
	}
	defer tx.Rollback(ctx)

	var estado string
	var intentos int
	err = tx.QueryRow(ctx,
		"SELECT estado, intentos_reclamo FROM pago_yape WHERE id_pago = $1 AND id_restaurante = $2 FOR UPDATE",
		idPago, idRestaurante,
	).Scan(&estado, &intentos)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "pago no encontrado"})
		return
	}
	if err != nil {
		responderError(c, err)
		return
	}
	if estado == "confirmado" {
		tx.Rollback(ctx)
		h.Estado(c)
		return
	}
	if intentos >= maxIntentosReclamo {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "demasiados intentos, comunícate con soporte para revisar tu pago"})
		return
	}

	var idNotificacion int
	err = tx.QueryRow(ctx,
		`SELECT n.id_notificacion FROM yape_notificacion n
		 JOIN pago_yape py ON py.id_pago = $1
		 WHERE n.id_pago IS NULL AND n.monto = py.monto AND n.codigo_seguridad = $2
		   AND n.recibido_en >= py.creado_en AND n.recibido_en <= py.creado_en + make_interval(hours => $3)
		 ORDER BY n.recibido_en LIMIT 1 FOR UPDATE OF n`,
		idPago, req.CodigoSeguridad, int(ventanaReclamo.Hours()),
	).Scan(&idNotificacion)
	if errors.Is(err, pgx.ErrNoRows) {
		if _, err := tx.Exec(ctx, "UPDATE pago_yape SET intentos_reclamo = intentos_reclamo + 1 WHERE id_pago = $1", idPago); err == nil {
			_ = tx.Commit(ctx)
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "todavía no recibimos un yapeo con ese código y monto. Si acabas de pagar, espera un minuto e intenta de nuevo"})
		return
	}
	if err != nil {
		responderError(c, err)
		return
	}

	if err := confirmarPagoYape(ctx, tx, idPago, idNotificacion); err != nil {
		responderError(c, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		responderError(c, err)
		return
	}
	h.Estado(c)
}

type webhookYapeRequest struct {
	Texto  string `json:"texto" binding:"required"`
	Titulo string `json:"titulo"`
	// Identificadores de la notificación en Android: el script reenvía la
	// misma notificación mientras siga en la bandeja, con estos se deduplica.
	Clave  string `json:"clave"`
	Cuando int64  `json:"cuando"`
}

// Webhook recibe las notificaciones de Yape que reenvía el script del
// celular. No lleva JWT: se autentica con el header X-Yape-Secret.
func (h *PagoYapeHandler) Webhook(c *gin.Context) {
	if h.WebhookSecret == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook de Yape no configurado"})
		return
	}
	if subtle.ConstantTimeCompare([]byte(c.GetHeader("X-Yape-Secret")), []byte(h.WebhookSecret)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "clave inválida"})
		return
	}

	var req webhookYapeRequest
	if !leerJSON(c, &req) {
		return
	}

	pago, ok := yape.Parsear(req.Texto)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"resultado": "ignorada"})
		return
	}

	suma := sha256.Sum256([]byte(fmt.Sprintf("%s|%d|%s", req.Clave, req.Cuando, req.Texto)))
	huella := hex.EncodeToString(suma[:])

	ctx := c.Request.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		responderError(c, err)
		return
	}
	defer tx.Rollback(ctx)

	var codigo *string
	if pago.CodigoSeguridad != "" {
		codigo = &pago.CodigoSeguridad
	}
	var idNotificacion int
	err = tx.QueryRow(ctx,
		`INSERT INTO yape_notificacion (remitente, monto, codigo_seguridad, texto_original, huella)
		 VALUES ($1, $2::numeric, $3, $4, $5)
		 ON CONFLICT (huella) DO NOTHING
		 RETURNING id_notificacion`,
		pago.Remitente, pago.Monto(), codigo, req.Texto, huella,
	).Scan(&idNotificacion)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusOK, gin.H{"resultado": "duplicada"})
		return
	}
	if err != nil {
		responderError(c, err)
		return
	}

	var idPago int
	err = tx.QueryRow(ctx,
		`SELECT id_pago FROM pago_yape
		 WHERE estado = 'esperando' AND monto = $1::numeric AND expira_en + make_interval(secs => $2) > now()
		 ORDER BY creado_en LIMIT 1 FOR UPDATE`,
		pago.Monto(), toleranciaNotificacion.Seconds(),
	).Scan(&idPago)
	resultado := "sin_asignar"
	if err == nil {
		if err := confirmarPagoYape(ctx, tx, idPago, idNotificacion); err != nil {
			responderError(c, err)
			return
		}
		resultado = "asignada"
	} else if !errors.Is(err, pgx.ErrNoRows) {
		responderError(c, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		responderError(c, err)
		return
	}
	log.Printf("yape: S/ %s de %q -> %s", pago.Monto(), pago.Remitente, resultado)
	c.JSON(http.StatusOK, gin.H{"resultado": resultado, "monto": pago.Monto()})
}

// confirmarPagoYape vincula la notificación al pago y activa el plan pagado.
// Si el restaurante ya tenía ese mismo plan vigente (renovación), el nuevo
// mes se suma al final del actual en vez de empezar hoy.
func confirmarPagoYape(ctx context.Context, tx pgx.Tx, idPago, idNotificacion int) error {
	var idRestaurante, idPlan int
	var monto float64
	if err := tx.QueryRow(ctx,
		"SELECT id_restaurante, id_plan, monto FROM pago_yape WHERE id_pago = $1",
		idPago,
	).Scan(&idRestaurante, &idPlan, &monto); err != nil {
		return err
	}

	inicio := time.Now()
	var idActual, idPlanActual int
	var finActual time.Time
	err := tx.QueryRow(ctx,
		"SELECT id_suscripcion, id_plan, fecha_fin FROM suscripcion WHERE id_restaurante = $1 AND estado = 'activa' FOR UPDATE",
		idRestaurante,
	).Scan(&idActual, &idPlanActual, &finActual)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	renovacion := err == nil && idPlanActual == idPlan
	if renovacion && finActual.After(inicio) {
		inicio = finActual
	}
	fin := inicio.AddDate(0, 1, 0)

	idSuscripcion := idActual
	if renovacion {
		if _, err := tx.Exec(ctx,
			"UPDATE suscripcion SET fecha_fin = $2, metodo_pago = 'yape', renueva_en = NULL WHERE id_suscripcion = $1",
			idActual, fin,
		); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx,
			"UPDATE suscripcion SET estado = 'cancelada', cancelado_en = now() WHERE id_restaurante = $1 AND estado = 'activa'",
			idRestaurante,
		); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx,
			`INSERT INTO suscripcion (id_restaurante, id_plan, metodo_pago, estado, fecha_inicio, fecha_fin)
			 VALUES ($1, $2, 'yape', 'activa', $3, $4) RETURNING id_suscripcion`,
			idRestaurante, idPlan, inicio, fin,
		).Scan(&idSuscripcion); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO factura (id_suscripcion, monto, estado, periodo_inicio, periodo_fin, fecha_pago, moneda)
		 VALUES ($1, $2, 'pagada', $3, $4, now(), 'PEN')`,
		idSuscripcion, monto, inicio, fin,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pago_yape SET estado = 'confirmado', confirmado_en = now(), id_suscripcion = $2 WHERE id_pago = $1`,
		idPago, idSuscripcion,
	); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "UPDATE yape_notificacion SET id_pago = $2 WHERE id_notificacion = $1", idNotificacion, idPago)
	return err
}
