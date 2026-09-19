package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

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
	IDPlan     int    `json:"id_plan" binding:"required"`
	MetodoPago string `json:"metodo_pago" binding:"required,oneof=tarjeta yape plin transferencia otro"`
}

// Suscribir simula el checkout: cierra la suscripción activa (si la hay),
// abre una nueva con el plan elegido y emite su primera factura pagada.
func (h *SuscripcionHandler) Suscribir(c *gin.Context) {
	var req suscribirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var precio float64
	if err := tx.QueryRow(ctx, "SELECT precio FROM plan WHERE id_plan = $1 AND activo", req.IDPlan).Scan(&precio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "el plan indicado no existe"})
		return
	}

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

	if _, err := tx.Exec(ctx,
		`INSERT INTO factura (id_suscripcion, monto, estado, periodo_inicio, periodo_fin, fecha_pago)
		 VALUES ($1, $2, 'pagada', $3, $4, now())`,
		idSuscripcion, precio, inicio, fin,
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
		`SELECT f.id_factura, f.monto, f.estado, f.periodo_inicio, f.periodo_fin, f.fecha_emision
		 FROM factura f
		 JOIN suscripcion s ON s.id_suscripcion = f.id_suscripcion
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
	}

	facturas := []factura{}
	for rows.Next() {
		var f factura
		if err := rows.Scan(&f.IDFactura, &f.Monto, &f.Estado, &f.PeriodoInicio, &f.PeriodoFin, &f.FechaEmision); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		facturas = append(facturas, f)
	}

	c.JSON(http.StatusOK, facturas)
}
