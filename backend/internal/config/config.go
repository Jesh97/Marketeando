package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                  string
	DatabaseURL           string
	JWTSecret             string
	UploadDir             string
	CulqiSecretKey        string
	CloudinaryCloudName   string
	CloudinaryAPIKey      string
	CloudinaryAPISecret   string
	// Cobro con Yape personal (ver handlers/pago_yape.go).
	YapeNumero            string
	YapeTitular           string
	YapeQRURL             string
	YapeWebhookSecret     string
	// Orígenes del frontend autorizados por CORS (CORS_ORIGINS, separados por coma).
	CORSOrigins           []string
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		Port:                getEnv("PORT", "8080"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:71097191@localhost:5432/Marketing?sslmode=disable"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-change-me"),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		CulqiSecretKey:      getEnv("CULQI_SECRET_KEY", ""),
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
		YapeNumero:          getEnv("YAPE_NUMERO", ""),
		YapeTitular:         getEnv("YAPE_TITULAR", ""),
		YapeQRURL:           getEnv("YAPE_QR_URL", "/yape-qr.png"),
		YapeWebhookSecret:   getEnv("YAPE_WEBHOOK_SECRET", ""),
		CORSOrigins:         splitList(getEnv("CORS_ORIGINS", "http://localhost:5173")),
	}
}

func splitList(value string) []string {
	var items []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimRight(strings.TrimSpace(item), "/"); item != "" {
			items = append(items, item)
		}
	}
	return items
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
