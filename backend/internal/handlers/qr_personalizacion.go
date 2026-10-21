package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/cloudinaryutil"
	"marketeando/backend/internal/models"
)

type QRPersonalizacionHandler struct {
	DB        *pgxpool.Pool
	UploadDir string
}

func NewQRPersonalizacionHandler(db *pgxpool.Pool, uploadDir string) *QRPersonalizacionHandler {
	return &QRPersonalizacionHandler{DB: db, UploadDir: uploadDir}
}

var defaultColores = json.RawMessage(`{"puntos": "#0B1C30", "fondo": "#FFFFFF"}`)

var defaultAjustes = json.RawMessage(`{}`)

// Get devuelve la configuración guardada, o los valores por defecto si el
// restaurante todavía no personalizó su QR. El acceso ya está limitado a
// Enterprise por RequirePlan en la ruta.
func (h *QRPersonalizacionHandler) Get(c *gin.Context) {
	var q models.QRPersonalizacion
	q.IDRestaurante = currentRestauranteID(c)

	err := h.DB.QueryRow(
		c.Request.Context(),
		`SELECT modo, colores, sensibilidad, ajustes, logo_url, fecha_actualizacion
		 FROM qr_personalizacion WHERE id_restaurante = $1`,
		q.IDRestaurante,
	).Scan(&q.Modo, &q.Colores, &q.Sensibilidad, &q.Ajustes, &q.LogoURL, &q.FechaActualizacion)
	if errors.Is(err, pgx.ErrNoRows) {
		q.Modo = "classic"
		q.Colores = defaultColores
		q.Sensibilidad = 128
		q.Ajustes = defaultAjustes
		c.JSON(http.StatusOK, q)
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, q)
}

type guardarQRPersonalizacionRequest struct {
	Modo         string          `json:"modo" binding:"required,oneof=classic color halftone logo arte"`
	Colores      json.RawMessage `json:"colores" binding:"required"`
	Sensibilidad int             `json:"sensibilidad" binding:"min=0,max=255"`
	// Ajustes es opcional (clientes viejos no lo mandan): si falta, se
	// guarda "{}" y el frontend usa sus valores por defecto.
	Ajustes json.RawMessage `json:"ajustes"`
}

// Update guarda la configuración de diseño (no la imagen del logo, ver
// SubirLogo). Protegido por RequirePlan(db, "Enterprise") en la ruta.
func (h *QRPersonalizacionHandler) Update(c *gin.Context) {
	var req guardarQRPersonalizacionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !json.Valid(req.Colores) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "colores debe ser un JSON válido"})
		return
	}
	if len(req.Ajustes) == 0 || string(req.Ajustes) == "null" {
		req.Ajustes = defaultAjustes
	}
	if !json.Valid(req.Ajustes) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ajustes debe ser un JSON válido"})
		return
	}

	idRestaurante := currentRestauranteID(c)

	var q models.QRPersonalizacion
	q.IDRestaurante = idRestaurante
	err := h.DB.QueryRow(
		c.Request.Context(),
		`INSERT INTO qr_personalizacion (id_restaurante, modo, colores, sensibilidad, ajustes)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (id_restaurante) DO UPDATE
		   SET modo = EXCLUDED.modo, colores = EXCLUDED.colores,
		       sensibilidad = EXCLUDED.sensibilidad, ajustes = EXCLUDED.ajustes
		 RETURNING modo, colores, sensibilidad, ajustes, logo_url, fecha_actualizacion`,
		idRestaurante, req.Modo, []byte(req.Colores), req.Sensibilidad, []byte(req.Ajustes),
	).Scan(&q.Modo, &q.Colores, &q.Sensibilidad, &q.Ajustes, &q.LogoURL, &q.FechaActualizacion)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, q)
}

// SubirLogo sube el logo del QR a Cloudinary. Acepta PNG, JPG, SVG y WebP.
// Protegido por RequirePlan(db, "Enterprise") en la ruta.
func (h *QRPersonalizacionHandler) SubirLogo(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "falta el archivo (campo 'file')"})
		return
	}
	const maxLogoBytes = 2 << 20 // 2 MB
	if fileHeader.Size > maxLogoBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "el logo supera los 2 MB"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no se pudo leer el archivo"})
		return
	}
	defer file.Close()

	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	contentType := http.DetectContentType(head[:n])

	_, allowed := qrLogoExtensionesPermitidas[contentType]
	if !allowed && !looksLikeSVG(head[:n]) && !looksLikeWebP(head[:n]) {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "formato no soportado (usa png, jpg, svg o webp)"})
		return
	}

	reader := io.MultiReader(bytes.NewReader(head[:n]), file)
	logoURL, uploadErr := cloudinaryutil.Upload(c.Request.Context(), reader, "qr-logos")
	if uploadErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo subir el logo: " + uploadErr.Error()})
		return
	}

	idRestaurante := currentRestauranteID(c)

	var q models.QRPersonalizacion
	q.IDRestaurante = idRestaurante
	err = h.DB.QueryRow(
		c.Request.Context(),
		`INSERT INTO qr_personalizacion (id_restaurante, logo_url)
		 VALUES ($1, $2)
		 ON CONFLICT (id_restaurante) DO UPDATE SET logo_url = EXCLUDED.logo_url
		 RETURNING modo, colores, sensibilidad, ajustes, logo_url, fecha_actualizacion`,
		idRestaurante, logoURL,
	).Scan(&q.Modo, &q.Colores, &q.Sensibilidad, &q.Ajustes, &q.LogoURL, &q.FechaActualizacion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, q)
}

// qrLogoExtensionesPermitidas: como extensionesPermitidas (editor.go) pero
// agrega SVG y WebP, que ahí no se admiten (ambos se detectan aparte, ver
// looksLikeSVG/looksLikeWebP, porque http.DetectContentType no los reconoce).
var qrLogoExtensionesPermitidas = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
}

// looksLikeSVG cubre el caso (común en exports de diseño) donde el SVG no
// trae declaración "<?xml", que es la única firma de XML que
// http.DetectContentType reconoce; sin esto, sniffea como text/plain y
// un logo SVG válido quedaría rechazado.
func looksLikeSVG(head []byte) bool {
	return bytes.Contains(bytes.ToLower(head), []byte("<svg"))
}

// looksLikeWebP: http.DetectContentType no tiene firma para WebP (formato
// "web" por excelencia: lo exportan Chrome, Figma, WhatsApp, etc). El
// formato es RIFF (bytes 0-3) + tamaño (4-7) + "WEBP" (bytes 8-11).
func looksLikeWebP(head []byte) bool {
	return len(head) >= 12 &&
		bytes.Equal(head[0:4], []byte("RIFF")) &&
		bytes.Equal(head[8:12], []byte("WEBP"))
}
