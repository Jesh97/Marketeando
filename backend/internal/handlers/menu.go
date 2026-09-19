package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type MenuHandler struct {
	DB *pgxpool.Pool
}

func NewMenuHandler(db *pgxpool.Pool) *MenuHandler {
	return &MenuHandler{DB: db}
}

func (h *MenuHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		`SELECT id_menu, id_restaurante, nombre, es_principal, activo, fecha_creacion, fecha_actualizacion
		 FROM menu WHERE id_restaurante = $1 AND activo ORDER BY es_principal DESC, id_menu`,
		currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	menus := []models.Menu{}
	for rows.Next() {
		var m models.Menu
		if err := rows.Scan(&m.IDMenu, &m.IDRestaurante, &m.Nombre, &m.EsPrincipal, &m.Activo,
			&m.FechaCreacion, &m.FechaActualizacion); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		menus = append(menus, m)
	}

	c.JSON(http.StatusOK, menus)
}

type crearMenuRequest struct {
	Nombre string `json:"nombre" binding:"required"`
}

// Create crea un menú nuevo, respetando el max_menu del plan activo del
// restaurante (mismo límite que el MenuSwitcher del Editor en el frontend).
func (h *MenuHandler) Create(c *gin.Context) {
	var req crearMenuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	idRestaurante := currentRestauranteID(c)

	var maxMenu int
	err := h.DB.QueryRow(ctx,
		"SELECT max_menu FROM v_plan_restaurante WHERE id_restaurante = $1", idRestaurante,
	).Scan(&maxMenu)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "este restaurante no tiene una suscripción activa"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var totalMenus int
	if err := h.DB.QueryRow(ctx,
		"SELECT count(*) FROM menu WHERE id_restaurante = $1 AND activo", idRestaurante,
	).Scan(&totalMenus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if totalMenus >= maxMenu {
		c.JSON(http.StatusForbidden, gin.H{
			"error":    "tu plan actual no permite crear más menús",
			"max_menu": maxMenu,
		})
		return
	}

	esPrincipal := totalMenus == 0

	var m models.Menu
	err = h.DB.QueryRow(ctx,
		`INSERT INTO menu (id_restaurante, nombre, es_principal) VALUES ($1, $2, $3)
		 RETURNING id_menu, id_restaurante, nombre, es_principal, activo, fecha_creacion, fecha_actualizacion`,
		idRestaurante, req.Nombre, esPrincipal,
	).Scan(&m.IDMenu, &m.IDRestaurante, &m.Nombre, &m.EsPrincipal, &m.Activo, &m.FechaCreacion, &m.FechaActualizacion)
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "ya existe un menú con ese nombre"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, m)
}

func menuIDFromParam(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id_menu"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_menu inválido"})
		return 0, false
	}
	return id, true
}

// Borrador devuelve la versión en estado "borrador" del menú (la que edita
// el Editor en tiempo real).
func (h *MenuHandler) Borrador(c *gin.Context) {
	idMenu, ok := menuIDFromParam(c)
	if !ok {
		return
	}

	var v models.MenuVersion
	err := h.DB.QueryRow(
		c.Request.Context(),
		`SELECT mv.id_version, mv.id_menu, mv.numero, mv.estado, mv.contenido,
		        mv.fecha_creacion, mv.fecha_actualizacion, mv.fecha_publicacion
		 FROM menu_version mv
		 JOIN menu m ON m.id_menu = mv.id_menu
		 WHERE mv.id_menu = $1 AND mv.estado = 'borrador' AND m.id_restaurante = $2`,
		idMenu, currentRestauranteID(c),
	).Scan(&v.IDVersion, &v.IDMenu, &v.Numero, &v.Estado, &v.Contenido,
		&v.FechaCreacion, &v.FechaActualizacion, &v.FechaPublicacion)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "el menú no tiene un borrador"})
		return
	}

	c.JSON(http.StatusOK, v)
}

type actualizarBorradorRequest struct {
	Contenido map[string]any `json:"contenido" binding:"required"`
}

// GuardarBorrador es el autoguardado del editor: reemplaza el contenido
// (tema + bloques) del borrador actual.
func (h *MenuHandler) GuardarBorrador(c *gin.Context) {
	idMenu, ok := menuIDFromParam(c)
	if !ok {
		return
	}

	var req actualizarBorradorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var v models.MenuVersion
	err := h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE menu_version mv SET contenido = $1
		 FROM menu m
		 WHERE mv.id_menu = m.id_menu AND mv.id_menu = $2 AND mv.estado = 'borrador' AND m.id_restaurante = $3
		 RETURNING mv.id_version, mv.id_menu, mv.numero, mv.estado, mv.contenido,
		           mv.fecha_creacion, mv.fecha_actualizacion, mv.fecha_publicacion`,
		req.Contenido, idMenu, currentRestauranteID(c),
	).Scan(&v.IDVersion, &v.IDMenu, &v.Numero, &v.Estado, &v.Contenido,
		&v.FechaCreacion, &v.FechaActualizacion, &v.FechaPublicacion)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "el menú no tiene un borrador"})
		return
	}

	c.JSON(http.StatusOK, v)
}

// Publicar promueve el borrador a "publicada" usando la función SQL
// publicar_menu(), que archiva la versión anterior y abre un borrador nuevo.
func (h *MenuHandler) Publicar(c *gin.Context) {
	idMenu, ok := menuIDFromParam(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()

	// Verifica que el menú sea del restaurante actual antes de publicar.
	var idRestauranteMenu int
	if err := h.DB.QueryRow(ctx, "SELECT id_restaurante FROM menu WHERE id_menu = $1", idMenu).Scan(&idRestauranteMenu); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "menú no encontrado"})
		return
	}
	if idRestauranteMenu != currentRestauranteID(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "no tienes acceso a este menú"})
		return
	}

	var idVersionPublicada int
	if err := h.DB.QueryRow(ctx, "SELECT publicar_menu($1)", idMenu).Scan(&idVersionPublicada); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id_version_publicada": idVersionPublicada})
}
