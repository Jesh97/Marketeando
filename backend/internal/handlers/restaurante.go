package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type RestauranteHandler struct {
	DB        *pgxpool.Pool
	UploadDir string
}

func NewRestauranteHandler(db *pgxpool.Pool, uploadDir string) *RestauranteHandler {
	return &RestauranteHandler{DB: db, UploadDir: uploadDir}
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
		        url_logo, telefono, zona_horaria, plantilla, activo, fecha_registro
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
			&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Plantilla, &r.Activo, &r.FechaRegistro); err != nil {
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
		           url_logo, telefono, zona_horaria, plantilla, activo, fecha_registro`,
		currentUserID(c), req.Nombre, req.Subdominio, req.Slogan, req.Telefono,
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Plantilla, &r.Activo, &r.FechaRegistro)
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
		        url_logo, telefono, zona_horaria, plantilla, activo, fecha_registro
		 FROM restaurante WHERE id_restaurante = $1`,
		currentRestauranteID(c),
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Plantilla, &r.Activo, &r.FechaRegistro)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "restaurante no encontrado"})
		return
	}

	c.JSON(http.StatusOK, r)
}

type actualizarRestauranteRequest struct {
	Nombre     string  `json:"nombre" binding:"required"`
	Subdominio *string `json:"subdominio"`
	Slogan     *string `json:"slogan"`
	Telefono   *string `json:"telefono"`
	Plantilla  *string `json:"plantilla"`
}

func (h *RestauranteHandler) Update(c *gin.Context) {
	var req actualizarRestauranteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	plantilla := "costero"
	if req.Plantilla != nil && *req.Plantilla != "" {
		plantilla = *req.Plantilla
	}

	if req.Subdominio != nil && *req.Subdominio != "" {
		_, err := h.DB.Exec(ctx,
			"UPDATE restaurante SET nombre = $1, subdominio = $2, slogan = $3, telefono = $4, plantilla = $5 WHERE id_restaurante = $6",
			req.Nombre, *req.Subdominio, req.Slogan, req.Telefono, plantilla, currentRestauranteID(c),
		)
		if err != nil {
			if isUniqueViolation(err) {
				c.JSON(http.StatusConflict, gin.H{"error": "ese subdominio ya está en uso"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	} else {
		_, err := h.DB.Exec(ctx,
			"UPDATE restaurante SET nombre = $1, slogan = $2, telefono = $3, plantilla = $4 WHERE id_restaurante = $5",
			req.Nombre, req.Slogan, req.Telefono, plantilla, currentRestauranteID(c),
		)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
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

	// Estado del menú: por defecto usa el menú principal del restaurante.
	// Si se pasa ?id_local=N, usa el menú del local específico.
	var idMenuPrincipal *int
	var menuPublicado, menuEsDiseno bool
	_ = h.DB.QueryRow(ctx,
		`SELECT m.id_menu,
		        EXISTS(SELECT 1 FROM menu_version mv WHERE mv.id_menu = m.id_menu AND mv.estado = 'publicada'),
		        EXISTS(SELECT 1 FROM menu_version mv WHERE mv.id_menu = m.id_menu AND mv.estado = 'publicada'
		               AND mv.contenido ? 'diseno_html')
		 FROM menu m WHERE m.id_restaurante = $1 AND m.es_principal AND m.activo`,
		idRestaurante,
	).Scan(&idMenuPrincipal, &menuPublicado, &menuEsDiseno)

	if idLocalStr := c.Query("id_local"); idLocalStr != "" {
		if idLocal, err := strconv.Atoi(idLocalStr); err == nil && idLocal > 0 {
			var idMenuLocal *int
			var localPublicado, localEsDiseno bool
			queryErr := h.DB.QueryRow(ctx,
				`SELECT l.id_menu,
				        EXISTS(SELECT 1 FROM menu_version mv WHERE mv.id_menu = l.id_menu AND mv.estado = 'publicada'),
				        EXISTS(SELECT 1 FROM menu_version mv WHERE mv.id_menu = l.id_menu AND mv.estado = 'publicada'
				               AND mv.contenido ? 'diseno_html')
				 FROM local l WHERE l.id_local = $1 AND l.id_restaurante = $2 AND l.activo`,
				idLocal, idRestaurante,
			).Scan(&idMenuLocal, &localPublicado, &localEsDiseno)
			if queryErr == nil {
				idMenuPrincipal = idMenuLocal
				menuPublicado = localPublicado
				menuEsDiseno = localEsDiseno
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"visitas_30d":        visitas30d,
		"escaneos_qr_30d":    escaneosQR30d,
		"productos_agotados": agotados,
		"subdominio":         subdominio,
		"plan":               plan,
		"max_menu":           maxMenu,
		"max_local":          maxLocal,
		"id_menu_principal":  idMenuPrincipal,
		"menu_publicado":     menuPublicado,
		"menu_es_diseno":     menuEsDiseno,
	})
}

// SubirLogo sube el logo del restaurante a Cloudinary y guarda la URL en la BD.
func (h *RestauranteHandler) SubirLogo(c *gin.Context) {
	logoURL, ok := subirImagen(c, "logos")
	if !ok {
		return
	}

	var r models.Restaurante
	err := h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE restaurante SET url_logo = $1 WHERE id_restaurante = $2
		 RETURNING id_restaurante, id_usuario, id_tipo_restaurante, nombre, subdominio, slogan,
		           url_logo, telefono, zona_horaria, activo, fecha_registro`,
		logoURL, currentRestauranteID(c),
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Activo, &r.FechaRegistro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, r)
}
