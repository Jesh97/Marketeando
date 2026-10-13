package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/culqi"
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

type guardarMetodoPagoRequest struct {
	Tipo    string  `json:"tipo" binding:"required,oneof=tarjeta yape"`
	Titular *string `json:"titular"`
	TokenID *string `json:"token_id"`
}

// Guardar registra el método de pago del restaurante (upsert, uno por
// restaurante). Para "tarjeta" el número nunca llega aquí: el frontend ya lo
// tokenizó en el navegador con Culqi.js, y este handler cambia ese token de
// un solo uso por una tarjeta guardada (crd_) en Culqi, reutilizable para
// cobros futuros. "yape" no tiene nada que guardar como medio reutilizable:
// cada cobro con Yape pide un token nuevo (teléfono + OTP) en el momento, así
// que aquí solo se registra el tipo elegido.
func (h *MetodoPagoHandler) Guardar(c *gin.Context) {
	var req guardarMetodoPagoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	var customerID, cardID, marca, ultimos4 *string

	if req.Tipo == "tarjeta" {
		if req.TokenID == nil || *req.TokenID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "falta el token de la tarjeta"})
			return
		}

		var correo, nombre string
		var telefono *string
		if err := h.DB.QueryRow(ctx,
			`SELECT u.correo, u.nombre, r.telefono
			 FROM usuario u JOIN restaurante r ON r.id_usuario = u.id_usuario
			 WHERE r.id_restaurante = $1`,
			idRestaurante,
		).Scan(&correo, &nombre, &telefono); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		tel := ""
		if telefono != nil {
			tel = *telefono
		}

		var existente *string
		_ = h.DB.QueryRow(ctx,
			"SELECT culqi_customer_id FROM metodo_pago_guardado WHERE id_restaurante = $1",
			idRestaurante,
		).Scan(&existente)

		cid := ""
		if existente != nil && *existente != "" {
			cid = *existente
		} else {
			nuevoID, err := culqi.CrearCliente(correo, nombre, tel)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": "no se pudo registrar el cliente de pagos"})
				return
			}
			cid = nuevoID
		}

		crd, m, u4, err := culqi.GuardarTarjeta(cid, *req.TokenID)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "no se pudo guardar la tarjeta, verifica los datos"})
			return
		}

		customerID = &cid
		cardID = &crd
		if m != "" {
			marca = &m
		}
		if u4 != "" {
			ultimos4 = &u4
		}
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var m models.MetodoPago
	err = tx.QueryRow(
		ctx,
		`INSERT INTO metodo_pago_guardado (id_restaurante, tipo, titular, marca, ultimos4, culqi_customer_id, culqi_card_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (id_restaurante) DO UPDATE
		   SET tipo = EXCLUDED.tipo, titular = EXCLUDED.titular, marca = EXCLUDED.marca,
		       ultimos4 = EXCLUDED.ultimos4, culqi_customer_id = EXCLUDED.culqi_customer_id,
		       culqi_card_id = EXCLUDED.culqi_card_id, vencimiento = NULL, actualizado_en = now()
		 RETURNING id_restaurante, tipo, titular, marca, ultimos4, vencimiento, actualizado_en`,
		idRestaurante, req.Tipo, req.Titular, marca, ultimos4, customerID, cardID,
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
