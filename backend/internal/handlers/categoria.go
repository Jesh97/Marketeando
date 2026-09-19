package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type CategoriaHandler struct {
	DB *pgxpool.Pool
}

func NewCategoriaHandler(db *pgxpool.Pool) *CategoriaHandler {
	return &CategoriaHandler{DB: db}
}

func (h *CategoriaHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		`SELECT id_categoria, id_restaurante, nombre, orden, activo
		 FROM categoria WHERE id_restaurante = $1 ORDER BY orden, nombre`,
		currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	categorias := []models.Categoria{}
	for rows.Next() {
		var cat models.Categoria
		if err := rows.Scan(&cat.IDCategoria, &cat.IDRestaurante, &cat.Nombre, &cat.Orden, &cat.Activo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		categorias = append(categorias, cat)
	}

	c.JSON(http.StatusOK, categorias)
}

type categoriaRequest struct {
	Nombre string `json:"nombre" binding:"required"`
	Orden  int    `json:"orden"`
}

func (h *CategoriaHandler) Create(c *gin.Context) {
	var req categoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cat models.Categoria
	err := h.DB.QueryRow(
		c.Request.Context(),
		`INSERT INTO categoria (id_restaurante, nombre, orden) VALUES ($1, $2, $3)
		 RETURNING id_categoria, id_restaurante, nombre, orden, activo`,
		currentRestauranteID(c), req.Nombre, req.Orden,
	).Scan(&cat.IDCategoria, &cat.IDRestaurante, &cat.Nombre, &cat.Orden, &cat.Activo)
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "ya existe una categoría con ese nombre"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

func (h *CategoriaHandler) Update(c *gin.Context) {
	idCategoria, err := strconv.Atoi(c.Param("id_categoria"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_categoria inválido"})
		return
	}

	var req categoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag, err := h.DB.Exec(
		c.Request.Context(),
		"UPDATE categoria SET nombre = $1, orden = $2 WHERE id_categoria = $3 AND id_restaurante = $4",
		req.Nombre, req.Orden, idCategoria, currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "categoría no encontrada"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *CategoriaHandler) Delete(c *gin.Context) {
	idCategoria, err := strconv.Atoi(c.Param("id_categoria"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_categoria inválido"})
		return
	}

	tag, err := h.DB.Exec(
		c.Request.Context(),
		"DELETE FROM categoria WHERE id_categoria = $1 AND id_restaurante = $2",
		idCategoria, currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "categoría no encontrada"})
		return
	}

	c.Status(http.StatusNoContent)
}
