package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/culqi"
)

type CulqiWebhookHandler struct {
	DB *pgxpool.Pool
}

func NewCulqiWebhookHandler(db *pgxpool.Pool) *CulqiWebhookHandler {
	return &CulqiWebhookHandler{DB: db}
}

// extraerIDCargo busca el id del cargo en el payload del webhook. Culqi no
// documenta públicamente el esquema de firma de sus eventos, así que no
// usamos el body para nada más que ubicar el id — el estado real siempre se
// vuelve a pedir a la API de Culqi (ver culqi.ConsultarCargo).
func extraerIDCargo(raw []byte) string {
	var envelope struct {
		ID   string `json:"id"`
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return ""
	}
	if envelope.Data.ID != "" {
		return envelope.Data.ID
	}
	return envelope.ID
}

// Handle recibe la notificación, re-consulta el cargo contra la API de Culqi
// con la llave secreta (nunca confía en el body) y, solo si está aprobado,
// marca la factura como pagada y activa la suscripción si estaba pendiente.
// Es idempotente: reintentos del mismo evento no duplican nada.
func (h *CulqiWebhookHandler) Handle(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	chargeID := extraerIDCargo(raw)
	if chargeID == "" {
		c.Status(http.StatusOK)
		return
	}

	estado, err := culqi.ConsultarCargo(chargeID)
	if err != nil || (estado.Outcome.Type != "" && estado.Outcome.Type != "venta_exitosa") {
		c.Status(http.StatusOK)
		return
	}

	ctx := c.Request.Context()
	if _, err := h.DB.Exec(ctx,
		`UPDATE factura SET estado = 'pagada', fecha_pago = now()
		 WHERE culqi_charge_id = $1 AND estado <> 'pagada'`,
		chargeID,
	); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}

	if _, err := h.DB.Exec(ctx,
		`UPDATE suscripcion SET estado = 'activa'
		 WHERE estado = 'pendiente' AND id_suscripcion = (
		   SELECT id_suscripcion FROM factura WHERE culqi_charge_id = $1
		 )`,
		chargeID,
	); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}

	c.Status(http.StatusOK)
}
