package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type ProductoHandler struct {
	DB        *pgxpool.Pool
	UploadDir string
}

func NewProductoHandler(db *pgxpool.Pool, uploadDir string) *ProductoHandler {
	return &ProductoHandler{DB: db, UploadDir: uploadDir}
}

// Upload sube una foto de referencia para un producto y devuelve su URL
// pública. No queda asociada a ningún producto todavía: el frontend debe
// mandar la URL resultante como url_imagen al crear/actualizar el producto.
// Reutiliza las mismas reglas de validación que el upload del editor
// (extensionesPermitidas, randomFilename, maxUploadBytes en editor.go).
func (h *ProductoHandler) Upload(c *gin.Context) {
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

	dir := filepath.Join(h.UploadDir, "productos")
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

	c.JSON(http.StatusOK, gin.H{"url": "/uploads/productos/" + name})
}

const productoColumns = `id_producto, id_restaurante, id_categoria, nombre, descripcion, precio,
	url_imagen, activo, agotado, fecha_registro, fecha_actualizacion`

func scanProducto(row pgxScanner, p *models.Producto) error {
	return row.Scan(&p.IDProducto, &p.IDRestaurante, &p.IDCategoria, &p.Nombre, &p.Descripcion,
		&p.Precio, &p.URLImagen, &p.Activo, &p.Agotado, &p.FechaRegistro, &p.FechaActualizacion)
}

type pgxScanner interface {
	Scan(dest ...any) error
}

func (h *ProductoHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		"SELECT "+productoColumns+" FROM producto WHERE id_restaurante = $1 AND activo ORDER BY id_categoria, nombre",
		currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	productos := []models.Producto{}
	for rows.Next() {
		var p models.Producto
		if err := scanProducto(rows, &p); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		productos = append(productos, p)
	}

	c.JSON(http.StatusOK, productos)
}

type productoRequest struct {
	IDCategoria *int    `json:"id_categoria"`
	Nombre      string  `json:"nombre" binding:"required"`
	Descripcion *string `json:"descripcion"`
	Precio      float64 `json:"precio" binding:"required,min=0"`
	URLImagen   *string `json:"url_imagen"`
}

func (h *ProductoHandler) Create(c *gin.Context) {
	var req productoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var p models.Producto
	err := scanProducto(h.DB.QueryRow(
		c.Request.Context(),
		`INSERT INTO producto (id_restaurante, id_categoria, nombre, descripcion, precio, url_imagen)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+productoColumns,
		currentRestauranteID(c), req.IDCategoria, req.Nombre, req.Descripcion, req.Precio, req.URLImagen,
	), &p)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, p)
}

func (h *ProductoHandler) Update(c *gin.Context) {
	idProducto, err := strconv.Atoi(c.Param("id_producto"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_producto inválido"})
		return
	}

	var req productoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var p models.Producto
	err = scanProducto(h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE producto SET id_categoria = $1, nombre = $2, descripcion = $3, precio = $4, url_imagen = $5
		 WHERE id_producto = $6 AND id_restaurante = $7 RETURNING `+productoColumns,
		req.IDCategoria, req.Nombre, req.Descripcion, req.Precio, req.URLImagen,
		idProducto, currentRestauranteID(c),
	), &p)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "producto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, p)
}

// ToggleAgotado enciende/apaga el switch "Agotado" (igual que en la tabla de Productos del frontend).
func (h *ProductoHandler) ToggleAgotado(c *gin.Context) {
	idProducto, err := strconv.Atoi(c.Param("id_producto"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_producto inválido"})
		return
	}

	var p models.Producto
	err = scanProducto(h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE producto SET agotado = NOT agotado
		 WHERE id_producto = $1 AND id_restaurante = $2 RETURNING `+productoColumns,
		idProducto, currentRestauranteID(c),
	), &p)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "producto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, p)
}

func (h *ProductoHandler) Delete(c *gin.Context) {
	idProducto, err := strconv.Atoi(c.Param("id_producto"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_producto inválido"})
		return
	}

	// No se borra físicamente (los bloques del menú lo referencian por id): se desactiva.
	tag, err := h.DB.Exec(
		c.Request.Context(),
		"UPDATE producto SET activo = false WHERE id_producto = $1 AND id_restaurante = $2",
		idProducto, currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "producto no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
