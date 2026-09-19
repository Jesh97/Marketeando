package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type RestauranteHandler struct {
	DB *pgxpool.Pool
}

func NewRestauranteHandler(db *pgxpool.Pool) *RestauranteHandler {
	return &RestauranteHandler{DB: db}
}

type crearRestauranteRequest struct {
	Nombre     string  `json:"nombre" binding:"required"`
	Subdominio string  `json:"subdominio" binding:"required"`
	Slogan     *string `json:"slogan"`
	Telefono   *string `json:"telefono"`
}

// Mis restaurantes (los del usuario autenticado)
func (h *RestauranteHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		`SELECT id_restaurante, id_usuario, id_tipo_restaurante, nombre, subdominio, slogan,
		        url_logo, telefono, zona_horaria, activo, fecha_registro
		 FROM restaurante WHERE id_usuario = $1 AND activo ORDER BY id_restaurante`,
		currentUserID(c),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	restaurantes := []models.Restaurante{}
	for rows.Next() {
		var r models.Restaurante
		if err := rows.Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
			&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Activo, &r.FechaRegistro); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		restaurantes = append(restaurantes, r)
	}

	c.JSON(http.StatusOK, restaurantes)
}

func (h *RestauranteHandler) Create(c *gin.Context) {
	var req crearRestauranteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var r models.Restaurante
	err := h.DB.QueryRow(
		c.Request.Context(),
		`INSERT INTO restaurante (id_usuario, nombre, subdominio, slogan, telefono)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id_restaurante, id_usuario, id_tipo_restaurante, nombre, subdominio, slogan,
		           url_logo, telefono, zona_horaria, activo, fecha_registro`,
		currentUserID(c), req.Nombre, req.Subdominio, req.Slogan, req.Telefono,
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Activo, &r.FechaRegistro)
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "ese subdominio ya está en uso"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, r)
}

// Get devuelve el restaurante ya validado por el middleware RequireOwnRestaurante.
func (h *RestauranteHandler) Get(c *gin.Context) {
	var r models.Restaurante
	err := h.DB.QueryRow(
		c.Request.Context(),
		`SELECT id_restaurante, id_usuario, id_tipo_restaurante, nombre, subdominio, slogan,
		        url_logo, telefono, zona_horaria, activo, fecha_registro
		 FROM restaurante WHERE id_restaurante = $1`,
		currentRestauranteID(c),
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Activo, &r.FechaRegistro)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "restaurante no encontrado"})
		return
	}

	c.JSON(http.StatusOK, r)
}

type actualizarRestauranteRequest struct {
	Nombre   string  `json:"nombre" binding:"required"`
	Slogan   *string `json:"slogan"`
	Telefono *string `json:"telefono"`
}

func (h *RestauranteHandler) Update(c *gin.Context) {
	var req actualizarRestauranteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.DB.Exec(
		c.Request.Context(),
		"UPDATE restaurante SET nombre = $1, slogan = $2, telefono = $3 WHERE id_restaurante = $4",
		req.Nombre, req.Slogan, req.Telefono, currentRestauranteID(c),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.Get(c)
}

// Dashboard: tarjetas de estadísticas (visitas, escaneos QR, agotados)
func (h *RestauranteHandler) Dashboard(c *gin.Context) {
	idRestaurante := currentRestauranteID(c)
	ctx := c.Request.Context()

	var visitas30d, escaneosQR30d int
	err := h.DB.QueryRow(ctx,
		`SELECT count(*), count(*) FILTER (WHERE origen = 'qr')
		 FROM visita_menu WHERE id_restaurante = $1 AND fecha >= now() - interval '30 days'`,
		idRestaurante,
	).Scan(&visitas30d, &escaneosQR30d)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var agotados int
	err = h.DB.QueryRow(ctx,
		"SELECT count(*) FROM producto WHERE id_restaurante = $1 AND activo AND agotado",
		idRestaurante,
	).Scan(&agotados)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var subdominio string
	_ = h.DB.QueryRow(ctx, "SELECT subdominio FROM restaurante WHERE id_restaurante = $1", idRestaurante).Scan(&subdominio)

	var plan *string
	var maxMenu, maxLocal *int
	_ = h.DB.QueryRow(ctx,
		"SELECT plan, max_menu, max_local FROM v_plan_restaurante WHERE id_restaurante = $1",
		idRestaurante,
	).Scan(&plan, &maxMenu, &maxLocal)

	c.JSON(http.StatusOK, gin.H{
		"visitas_30d":        visitas30d,
		"escaneos_qr_30d":    escaneosQR30d,
		"productos_agotados": agotados,
		"subdominio":         subdominio,
		"plan":               plan,
		"max_menu":           maxMenu,
		"max_local":          maxLocal,
	})
}
