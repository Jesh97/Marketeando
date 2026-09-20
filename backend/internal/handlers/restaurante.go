package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"

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

	// El menú principal siempre existe una vez creado el primer menú (ver
	// MenuHandler.Create); menuPublicado indica si alguna vez se publicó,
	// para que el Dashboard pueda ofrecer "Publicar" o "Publicar cambios".
	var idMenuPrincipal *int
	var menuPublicado bool
	_ = h.DB.QueryRow(ctx,
		`SELECT m.id_menu,
		        EXISTS(SELECT 1 FROM menu_version mv WHERE mv.id_menu = m.id_menu AND mv.estado = 'publicada')
		 FROM menu m WHERE m.id_restaurante = $1 AND m.es_principal AND m.activo`,
		idRestaurante,
	).Scan(&idMenuPrincipal, &menuPublicado)

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
	})
}

// SubirLogo reemplaza el logo del restaurante: sube la imagen (misma
// validación que ProductoHandler.Upload/EditorHandler.Upload) y de una la
// deja guardada en restaurante.url_logo, sin un paso aparte de "Guardar".
func (h *RestauranteHandler) SubirLogo(c *gin.Context) {
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

	dir := filepath.Join(h.UploadDir, "restaurantes")
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

	url := "/uploads/restaurantes/" + name

	var r models.Restaurante
	err = h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE restaurante SET url_logo = $1 WHERE id_restaurante = $2
		 RETURNING id_restaurante, id_usuario, id_tipo_restaurante, nombre, subdominio, slogan,
		           url_logo, telefono, zona_horaria, activo, fecha_registro`,
		url, currentRestauranteID(c),
	).Scan(&r.IDRestaurante, &r.IDUsuario, &r.IDTipoRestaurante, &r.Nombre,
		&r.Subdominio, &r.Slogan, &r.URLLogo, &r.Telefono, &r.ZonaHoraria, &r.Activo, &r.FechaRegistro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, r)
}
