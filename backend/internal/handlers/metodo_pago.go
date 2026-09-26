package handlers

import (
	"errors"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type MetodoPagoHandler struct {
	DB *pgxpool.Pool
}

func NewMetodoPagoHandler(db *pgxpool.Pool) *MetodoPagoHandler {
	return &MetodoPagoHandler{DB: db}
}

func (h *MetodoPagoHandler) Get(c *gin.Context) {
	var m models.MetodoPago
	err := h.DB.QueryRow(
		c.Request.Context(),
		`SELECT id_restaurante, tipo, titular, marca, ultimos4, vencimiento, actualizado_en
		 FROM metodo_pago_guardado WHERE id_restaurante = $1`,
		currentRestauranteID(c),
	).Scan(&m.IDRestaurante, &m.Tipo, &m.Titular, &m.Marca, &m.Ultimos4, &m.Vencimiento, &m.ActualizadoEn)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "todavía no registraste un método de pago"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}

var soloDigitosRe = regexp.MustCompile(`[^0-9]`)

type guardarMetodoPagoRequest struct {
	Tipo        string  `json:"tipo" binding:"required,oneof=tarjeta yape"`
	Titular     *string `json:"titular"`
	Numero      *string `json:"numero"`
	Vencimiento *string `json:"vencimiento"`
}

func detectarMarca(numero string) string {
	switch numero[0] {
	case '4':
		return "Visa"
	case '5', '2':
		return "Mastercard"
	case '3':
		return "American Express"
	default:
		return "Tarjeta"
	}
}

// Guardar registra el método de pago del restaurante (upsert, uno por
// restaurante). Simula el guardado de una tarjeta sin pasarela real: del
// número solo derivamos la marca y los últimos 4 dígitos; el número
// completo nunca se persiste.
func (h *MetodoPagoHandler) Guardar(c *gin.Context) {
	var req guardarMetodoPagoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var marca, ultimos4 *string
	if req.Tipo == "tarjeta" {
		if req.Numero == nil || req.Vencimiento == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "faltan los datos de la tarjeta"})
			return
		}
		limpio := soloDigitosRe.ReplaceAllString(*req.Numero, "")
		if len(limpio) < 13 || len(limpio) > 19 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "número de tarjeta inválido"})
			return
		}
		m := detectarMarca(limpio)
		u := limpio[len(limpio)-4:]
		marca = &m
		ultimos4 = &u
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var m models.MetodoPago
	err = tx.QueryRow(
		ctx,
		`INSERT INTO metodo_pago_guardado (id_restaurante, tipo, titular, marca, ultimos4, vencimiento)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (id_restaurante) DO UPDATE
		   SET tipo = EXCLUDED.tipo, titular = EXCLUDED.titular, marca = EXCLUDED.marca,
		       ultimos4 = EXCLUDED.ultimos4, vencimiento = EXCLUDED.vencimiento, actualizado_en = now()
		 RETURNING id_restaurante, tipo, titular, marca, ultimos4, vencimiento, actualizado_en`,
		idRestaurante, req.Tipo, req.Titular, marca, ultimos4, req.Vencimiento,
	).Scan(&m.IDRestaurante, &m.Tipo, &m.Titular, &m.Marca, &m.Ultimos4, &m.Vencimiento, &m.ActualizadoEn)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Si hay una suscripción activa, la deja apuntando al mismo tipo de
	// método recién guardado (así "cambiar de plan" no vuelve a preguntar).
	if _, err := tx.Exec(
		ctx,
		"UPDATE suscripcion SET metodo_pago = $1 WHERE id_restaurante = $2 AND estado = 'activa'",
		req.Tipo, idRestaurante,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}
