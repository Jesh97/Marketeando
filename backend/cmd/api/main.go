package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"marketeando/backend/internal/cloudinaryutil"
	"marketeando/backend/internal/config"
	"marketeando/backend/internal/culqi"
	"marketeando/backend/internal/database"
	"marketeando/backend/internal/handlers"
	"marketeando/backend/internal/routes"
	"marketeando/backend/internal/validacion"
)

func main() {
	cfg := config.Load()
	culqi.Init(cfg.CulqiSecretKey)
	validacion.Registrar()

	if err := cloudinaryutil.Init(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret); err != nil {
		log.Fatalf("cloudinary init failed: %v", err)
	}

	ctx := context.Background()
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	if err := os.MkdirAll(cfg.UploadDir+"/editor", 0o755); err != nil {
		log.Fatalf("could not prepare upload dir: %v", err)
	}

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	router.Static("/uploads", cfg.UploadDir)

	routes.Register(router, db, cfg)
	handlers.IniciarVencimientos(ctx, db)

	log.Printf("server listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
