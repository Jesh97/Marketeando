package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type CampaignHandler struct {
	DB *pgxpool.Pool
}

func NewCampaignHandler(db *pgxpool.Pool) *CampaignHandler {
	return &CampaignHandler{DB: db}
}

func (h *CampaignHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(c.Request.Context(), "SELECT id, name, created_at FROM campaigns ORDER BY id DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	campaigns := []models.Campaign{}
	for rows.Next() {
		var camp models.Campaign
		if err := rows.Scan(&camp.ID, &camp.Name, &camp.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		campaigns = append(campaigns, camp)
	}

	c.JSON(http.StatusOK, campaigns)
}

type createCampaignRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *CampaignHandler) Create(c *gin.Context) {
	var req createCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var camp models.Campaign
	err := h.DB.QueryRow(
		c.Request.Context(),
		"INSERT INTO campaigns (name) VALUES ($1) RETURNING id, name, created_at",
		req.Name,
	).Scan(&camp.ID, &camp.Name, &camp.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, camp)
}
