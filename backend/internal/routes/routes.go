package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/handlers"
)

func Register(router *gin.Engine, db *pgxpool.Pool) {
	campaignHandler := handlers.NewCampaignHandler(db)

	api := router.Group("/api")
	{
		api.GET("/health", handlers.Health)

		campaigns := api.Group("/campaigns")
		{
			campaigns.GET("", campaignHandler.List)
			campaigns.POST("", campaignHandler.Create)
		}
	}
}
