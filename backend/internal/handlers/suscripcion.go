package handlers

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/culqi"
	"marketeando/backend/internal/models"
)

type SuscripcionHandler struct {
	DB *pgxpool.Pool
}

func NewSuscripcionHandler(db *pgxpool.Pool) *SuscripcionHandler {
	return &SuscripcionHandler{DB: db}
}

func (h *SuscripcionHandler) Get(c *gin.Context) {
	var s models.Suscripcion
	err := h.DB.QueryRow(
		c.Request.Context(),
		`SELECT s.id_suscripcion, s.id_restaurante, s.id_plan, p.nombre, s.metodo_pago,
		        s.estado, s.fecha_inicio, s.fecha_fin, s.renueva_en
		 FROM suscripcion s
		 JOIN plan p ON p.id_plan = s.id_plan
		 WHERE s.id_restaurante = $1 AND s.estado = 'activa'`,
		currentRestauranteID(c),
	).Scan(&s.IDSuscripcion, &s.IDRestaurante, &s.IDPlan, &s.Plan, &s.MetodoPago,
		&s.Estado, &s.FechaInicio, &s.FechaFin, &s.RenuevaEn)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "este restaurante no tiene una suscripción activa"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, s)
}

type suscribirRequest struct {
	IDPlan     int     `json:"id_plan" binding:"required"`
	MetodoPago string  `json:"metodo_pago" binding:"required,oneof=tarjeta yape"`
	TokenID    *string `json:"token_id"` // token ype_ fresco (teléfono+OTP), solo para metodo_pago = yape
}

// Suscribir cierra la suscripción activa (si la hay), cobra el plan elegido
// con Culqi y, solo si el cobro se aprueba, abre la nueva suscripción con su
// primera factura pagada. El cobro se hace FUERA de la transacción de base
// de datos (no tiene sentido mantenerla abierta durante una llamada de red a
// Culqi), y si falla no se toca la suscripción ni se emite ninguna factura.
func (h *SuscripcionHandler) Suscribir(c *gin.Context) {
	var req suscribirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	var precio float64
	if err := h.DB.QueryRow(ctx, "SELECT precio FROM plan WHERE id_plan = $1 AND activo", req.IDPlan).Scan(&precio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "el plan indicado no existe"})
		return
	}

	var chargeID string
	if precio > 0 {
		var correo string
		if err := h.DB.QueryRow(ctx,
			`SELECT u.correo FROM usuario u JOIN restaurante r ON r.id_usuario = u.id_usuario
			 WHERE r.id_restaurante = $1`,
			idRestaurante,
		).Scan(&correo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var sourceID string
		switch req.MetodoPago {
		case "tarjeta":
			var cardID *string
			if err := h.DB.QueryRow(ctx,
				"SELECT culqi_card_id FROM metodo_pago_guardado WHERE id_restaurante = $1 AND tipo = 'tarjeta'",
				idRestaurante,
			).Scan(&cardID); err != nil || cardID == nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "registra una tarjeta antes de suscribirte"})
				return
			}
			sourceID = *cardID
		case "yape":
			if req.TokenID == nil || *req.TokenID == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "falta confirmar el pago con Yape"})
				return
			}
			sourceID = *req.TokenID
		}

		montoCentavos := int(math.Round(precio * 100))
		id, err := culqi.Cobrar(montoCentavos, sourceID, correo, fmt.Sprintf("Suscripción plan #%d", req.IDPlan))
		if err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "no se pudo procesar el cobro, verifica tu método de pago"})
			return
		}
		chargeID = id
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		"UPDATE suscripcion SET estado = 'cancelada', cancelado_en = now() WHERE id_restaurante = $1 AND estado = 'activa'",
		idRestaurante,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	inicio := time.Now()
	fin := inicio.AddDate(0, 1, 0)
	renuevaEn := fin.UTC()

	var idSuscripcion int
	err = tx.QueryRow(ctx,
		`INSERT INTO suscripcion (id_restaurante, id_plan, metodo_pago, estado, fecha_inicio, fecha_fin, renueva_en)
		 VALUES ($1, $2, $3, 'activa', $4, $5, $6) RETURNING id_suscripcion`,
		idRestaurante, req.IDPlan, req.MetodoPago, inicio, fin, renuevaEn,
	).Scan(&idSuscripcion)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var chargeIDColumna *string
	if chargeID != "" {
		chargeIDColumna = &chargeID
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO factura (id_suscripcion, monto, estado, periodo_inicio, periodo_fin, fecha_pago, culqi_charge_id, moneda)
		 VALUES ($1, $2, 'pagada', $3, $4, now(), $5, 'PEN')`,
		idSuscripcion, precio, inicio, fin, chargeIDColumna,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.Get(c)
}

func (h *SuscripcionHandler) Facturas(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		`SELECT f.id_factura, f.monto, f.estado, f.periodo_inicio, f.periodo_fin, f.fecha_emision, p.nombre
		 FROM factura f
		 JOIN suscripcion s ON s.id_suscripcion = f.id_suscripcion
		 JOIN plan p ON p.id_plan = s.id_plan
		 WHERE s.id_restaurante = $1
		 ORDER BY f.fecha_emision DESC`,
		currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type factura struct {
		IDFactura     int       `json:"id_factura"`
		Monto         float64   `json:"monto"`
		Estado        string    `json:"estado"`
		PeriodoInicio time.Time `json:"periodo_inicio"`
		PeriodoFin    time.Time `json:"periodo_fin"`
		FechaEmision  time.Time `json:"fecha_emision"`
		Plan          string    `json:"plan"`
	}

	facturas := []factura{}
	for rows.Next() {
		var f factura
		if err := rows.Scan(&f.IDFactura, &f.Monto, &f.Estado, &f.PeriodoInicio, &f.PeriodoFin, &f.FechaEmision, &f.Plan); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		facturas = append(facturas, f)
	}

	c.JSON(http.StatusOK, facturas)
}
