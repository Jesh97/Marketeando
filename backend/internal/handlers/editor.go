package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
	"marketeando/backend/internal/sanitize"
)

type EditorHandler struct {
	DB        *pgxpool.Pool
	UploadDir string
}

func NewEditorHandler(db *pgxpool.Pool, uploadDir string) *EditorHandler {
	return &EditorHandler{DB: db, UploadDir: uploadDir}
}

const maxUploadBytes = 10 << 20 // 10 MB

// extensionesPermitidas mapea el content-type REAL del archivo (detectado por
// contenido, nunca por el nombre que manda el cliente) a una extensión seguro
// de usar. SVG queda fuera a propósito: puede llevar <script> embebido.
var extensionesPermitidas = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// Upload recibe un multipart form-data con el campo "file", valida que sea
// una imagen soportada y la guarda con un nombre generado al azar.
func (h *EditorHandler) Upload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "falta el archivo (campo 'file')"})
		return
	}
	if fileHeader.Size > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "la imagen supera los 10MB"})
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

	ext, ok := extensionesPermitidas[contentType]
	if !ok {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "formato no soportado (usa png, jpg, webp o gif)"})
		return
	}

	name, err := randomFilename()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo generar el archivo"})
		return
	}
	name += ext

	dir := filepath.Join(h.UploadDir, "editor")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo preparar el almacenamiento"})
		return
	}

	dest, err := os.Create(filepath.Join(dir, name))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo guardar el archivo"})
		return
	}
	defer dest.Close()

	if _, err := dest.Write(head[:n]); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo guardar el archivo"})
		return
	}
	if _, err := io.Copy(dest, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo guardar el archivo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": "/uploads/editor/" + name})
}

func randomFilename() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// List devuelve los documentos del usuario autenticado, sin el data_json/html
// completos (se piden aparte al abrir uno).
func (h *EditorHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		`SELECT id, title, created_at, updated_at FROM editor_documents
		 WHERE id_usuario = $1 ORDER BY updated_at DESC`,
		currentUserID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	documents := []models.EditorDocumentSummary{}
	for rows.Next() {
		var d models.EditorDocumentSummary
		if err := rows.Scan(&d.ID, &d.Title, &d.CreatedAt, &d.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		documents = append(documents, d)
	}

	c.JSON(http.StatusOK, documents)
}

// Get devuelve un documento completo (data_json + html_content), solo si
// pertenece al usuario autenticado.
func (h *EditorHandler) Get(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	var d models.EditorDocument
	err = h.DB.QueryRow(
		c.Request.Context(),
		`SELECT id, id_usuario, title, data_json, html_content, created_at, updated_at
		 FROM editor_documents WHERE id = $1 AND id_usuario = $2`,
		id, currentUserID(c),
	).Scan(&d.ID, &d.IDUsuario, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, d)
}

type saveDocumentRequest struct {
	ID          *int            `json:"id"`
	Title       string          `json:"title" binding:"required"`
	DataJSON    json.RawMessage `json:"data_json" binding:"required"`
	HTMLContent string          `json:"html_content"`
}

// Save crea el documento si no trae id, o actualiza uno existente (solo si
// es del usuario autenticado). El html_content SIEMPRE se re-sanitiza en el
// servidor: nunca se confía en lo que compiló el cliente.
func (h *EditorHandler) Save(c *gin.Context) {
	var req saveDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cleanHTML := sanitize.HTML(req.HTMLContent)
	ctx := c.Request.Context()
	idUsuario := currentUserID(c)

	var d models.EditorDocument

	if req.ID == nil {
		err := h.DB.QueryRow(ctx,
			`INSERT INTO editor_documents (id_usuario, title, data_json, html_content)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, id_usuario, title, data_json, html_content, created_at, updated_at`,
			idUsuario, req.Title, req.DataJSON, cleanHTML,
		).Scan(&d.ID, &d.IDUsuario, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, d)
		return
	}

	err := h.DB.QueryRow(ctx,
		`UPDATE editor_documents SET title = $1, data_json = $2, html_content = $3
		 WHERE id = $4 AND id_usuario = $5
		 RETURNING id, id_usuario, title, data_json, html_content, created_at, updated_at`,
		req.Title, req.DataJSON, cleanHTML, *req.ID, idUsuario,
	).Scan(&d.ID, &d.IDUsuario, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, d)
}

// Delete borra un documento del usuario autenticado.
func (h *EditorHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	tag, err := h.DB.Exec(c.Request.Context(),
		"DELETE FROM editor_documents WHERE id = $1 AND id_usuario = $2", id, currentUserID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
