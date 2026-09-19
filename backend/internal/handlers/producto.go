package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type ProductoHandler struct {
	DB *pgxpool.Pool
}

func NewProductoHandler(db *pgxpool.Pool) *ProductoHandler {
	return &ProductoHandler{DB: db}
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
