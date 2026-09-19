package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type PlanHandler struct {
	DB *pgxpool.Pool
}

func NewPlanHandler(db *pgxpool.Pool) *PlanHandler {
	return &PlanHandler{DB: db}
}

// List es pública: la usa la landing/checkout para mostrar los planes disponibles.
func (h *PlanHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		"SELECT id_plan, nombre, precio, max_menu, max_local, activo FROM plan WHERE activo ORDER BY precio",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	planes := []models.Plan{}
	for rows.Next() {
		var p models.Plan
		if err := rows.Scan(&p.IDPlan, &p.Nombre, &p.Precio, &p.MaxMenu, &p.MaxLocal, &p.Activo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		planes = append(planes, p)
	}

	c.JSON(http.StatusOK, planes)
}
