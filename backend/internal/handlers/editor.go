package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
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

const maxUploadBytes = 5 << 20 // 5 MB

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
// una imagen soportada y la sube a Cloudinary.
func (h *EditorHandler) Upload(c *gin.Context) {
	url, ok := subirImagen(c, "editor")
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func randomFilename() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// List devuelve los documentos del usuario. Con ?id_menu=N filtra los del
// local específico; sin él devuelve todos (para compatibilidad).
func (h *EditorHandler) List(c *gin.Context) {
	ctx := c.Request.Context()
	idUsuario := currentUserID(c)

	var (
		rows pgx.Rows
		err  error
	)
	if idMenuStr := c.Query("id_menu"); idMenuStr != "" {
		idMenu, _ := strconv.Atoi(idMenuStr)
		rows, err = h.DB.Query(ctx,
			`SELECT id, title, data_json, created_at, updated_at FROM editor_documents
			 WHERE id_usuario = $1 AND id_menu = $2 ORDER BY updated_at DESC`,
			idUsuario, idMenu,
		)
	} else {
		rows, err = h.DB.Query(ctx,
			`SELECT id, title, data_json, created_at, updated_at FROM editor_documents
			 WHERE id_usuario = $1 ORDER BY updated_at DESC`,
			idUsuario,
		)
	}
	if err != nil {
		responderError(c, err)
		return
	}
	defer rows.Close()

	documents := []models.EditorDocumentSummary{}
	for rows.Next() {
		var d models.EditorDocumentSummary
		if err := rows.Scan(&d.ID, &d.Title, &d.DataJSON, &d.CreatedAt, &d.UpdatedAt); err != nil {
			responderError(c, err)
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
		`SELECT id, id_usuario, id_menu, title, data_json, html_content, created_at, updated_at
		 FROM editor_documents WHERE id = $1 AND id_usuario = $2`,
		id, currentUserID(c),
	).Scan(&d.ID, &d.IDUsuario, &d.IDMenu, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}
	if err != nil {
		responderError(c, err)
		return
	}

	c.JSON(http.StatusOK, d)
}

type saveDocumentRequest struct {
	ID          *int            `json:"id"`
	IDMenu      *int            `json:"id_menu"`
	Title       string          `json:"title" binding:"required,max=150"`
	DataJSON    json.RawMessage `json:"data_json" binding:"required"`
	HTMLContent string          `json:"html_content"`
}

// Save crea el documento si no trae id, o actualiza uno existente (solo si
// es del usuario autenticado). El html_content SIEMPRE se re-sanitiza en el
// servidor: nunca se confía en lo que compiló el cliente.
func (h *EditorHandler) Save(c *gin.Context) {
	var req saveDocumentRequest
	if !leerJSON(c, &req) {
		return
	}

	cleanHTML := sanitize.HTML(req.HTMLContent)
	ctx := c.Request.Context()
	idUsuario := currentUserID(c)

	var d models.EditorDocument

	if req.ID == nil {
		err := h.DB.QueryRow(ctx,
			`INSERT INTO editor_documents (id_usuario, id_menu, title, data_json, html_content)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, id_usuario, id_menu, title, data_json, html_content, created_at, updated_at`,
			idUsuario, req.IDMenu, req.Title, req.DataJSON, cleanHTML,
		).Scan(&d.ID, &d.IDUsuario, &d.IDMenu, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
		if err != nil {
			responderError(c, err)
			return
		}
		c.JSON(http.StatusCreated, d)
		return
	}

	err := h.DB.QueryRow(ctx,
		`UPDATE editor_documents SET title = $1, data_json = $2, html_content = $3
		 WHERE id = $4 AND id_usuario = $5
		 RETURNING id, id_usuario, id_menu, title, data_json, html_content, created_at, updated_at`,
		req.Title, req.DataJSON, cleanHTML, *req.ID, idUsuario,
	).Scan(&d.ID, &d.IDUsuario, &d.IDMenu, &d.Title, &d.DataJSON, &d.HTMLContent, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}
	if err != nil {
		responderError(c, err)
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
		responderError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "documento no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
