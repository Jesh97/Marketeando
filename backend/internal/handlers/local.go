package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/models"
)

type LocalHandler struct {
	DB *pgxpool.Pool
}

func NewLocalHandler(db *pgxpool.Pool) *LocalHandler {
	return &LocalHandler{DB: db}
}

const localColumns = `id_local, id_restaurante, id_menu, nombre, slug,
	direccion, telefono, horario, activo, fecha_registro`

func scanLocal(row pgxScanner, l *models.Local) error {
	return row.Scan(
		&l.IDLocal, &l.IDRestaurante, &l.IDMenu, &l.Nombre, &l.Slug,
		&l.Direccion, &l.Telefono, &l.Horario, &l.Activo, &l.FechaRegistro,
	)
}

func (h *LocalHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(
		c.Request.Context(),
		"SELECT "+localColumns+" FROM local WHERE id_restaurante = $1 AND activo ORDER BY id_local",
		currentRestauranteID(c),
	)
	if err != nil {
		responderError(c, err)
		return
	}
	defer rows.Close()

	locals := []models.Local{}
	for rows.Next() {
		var l models.Local
		if err := scanLocal(rows, &l); err != nil {
			responderError(c, err)
			return
		}
		locals = append(locals, l)
	}
	c.JSON(http.StatusOK, locals)
}

type localRequest struct {
	Nombre        string   `json:"nombre" binding:"required,min=2,max=100"`
	Slug          string   `json:"slug" binding:"max=40"`
	Direccion     *string  `json:"direccion" binding:"omitempty,max=150"`
	Telefono      *string  `json:"telefono" binding:"omitempty,telefono"`
	HorarioTexto  *string  `json:"horario_texto" binding:"omitempty,max=150"`
	HorarioDias   []string `json:"horario_dias" binding:"max=7,dive,max=20"`
	HorarioDesde  string   `json:"horario_desde" binding:"omitempty,hora"`
	HorarioHasta  string   `json:"horario_hasta" binding:"omitempty,hora"`
}

func buildHorarioJSON(req localRequest) *string {
	// Structured form takes priority over free-text
	if len(req.HorarioDias) > 0 && req.HorarioDesde != "" && req.HorarioHasta != "" {
		b, _ := json.Marshal(map[string]any{
			"dias":  req.HorarioDias,
			"desde": req.HorarioDesde,
			"hasta": req.HorarioHasta,
		})
		s := string(b)
		return &s
	}
	if req.HorarioTexto != nil && *req.HorarioTexto != "" {
		b, _ := json.Marshal(map[string]string{"texto": *req.HorarioTexto})
		s := string(b)
		return &s
	}
	return nil
}

func (h *LocalHandler) Create(c *gin.Context) {
	idRestaurante := currentRestauranteID(c)
	ctx := c.Request.Context()

	// Verificar límite del plan
	var maxLocal int
	if err := h.DB.QueryRow(ctx,
		"SELECT max_local FROM v_plan_restaurante WHERE id_restaurante = $1",
		idRestaurante,
	).Scan(&maxLocal); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "no tienes un plan activo"})
		return
	}

	var countActual int
	if err := h.DB.QueryRow(ctx,
		"SELECT count(*) FROM local WHERE id_restaurante = $1 AND activo",
		idRestaurante,
	).Scan(&countActual); err != nil {
		responderError(c, err)
		return
	}

	if countActual >= maxLocal {
		c.JSON(http.StatusForbidden, gin.H{
			"error":     "alcanzaste el límite de locales de tu plan",
			"limite":    maxLocal,
			"actuales":  countActual,
		})
		return
	}

	var req localRequest
	if !leerJSON(c, &req) {
		return
	}

	// Generar slug único (prueba base, base-2, base-3…)
	baseSlug := req.Slug
	if baseSlug == "" {
		baseSlug = slugifyBase(req.Nombre)
	}

	horarioJSON := buildHorarioJSON(req)

	var l models.Local
	var insertErr error
	for attempt := 1; attempt <= 20; attempt++ {
		candidate := baseSlug
		if attempt > 1 {
			sufijo := fmt.Sprintf("-%d", attempt)
			b := baseSlug
			if max := 40 - len(sufijo); len(b) > max {
				b = b[:max]
			}
			candidate = b + sufijo
		}
		insertErr = h.DB.QueryRow(ctx,
			`INSERT INTO local (id_restaurante, nombre, slug, direccion, telefono, horario)
			 VALUES ($1, $2, $3, $4, $5, $6::jsonb)
			 RETURNING `+localColumns,
			idRestaurante, req.Nombre, candidate, req.Direccion, req.Telefono, horarioJSON,
		).Scan(
			&l.IDLocal, &l.IDRestaurante, &l.IDMenu, &l.Nombre, &l.Slug,
			&l.Direccion, &l.Telefono, &l.Horario, &l.Activo, &l.FechaRegistro,
		)
		if insertErr == nil {
			break
		}
		if !isUniqueViolation(insertErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": insertErr.Error()})
			return
		}
	}
	if insertErr != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "ya existe un local con ese nombre en este restaurante"})
		return
	}

	// Auto-crear menú para este local y vincularlo
	var idMenu int
	if err := h.DB.QueryRow(ctx,
		`INSERT INTO menu (id_restaurante, nombre, es_principal)
		 VALUES ($1, $2, false) RETURNING id_menu`,
		idRestaurante, req.Nombre,
	).Scan(&idMenu); err == nil {
		h.DB.Exec(ctx,
			"UPDATE local SET id_menu = $1 WHERE id_local = $2",
			idMenu, l.IDLocal,
		)
		l.IDMenu = &idMenu
	}

	c.JSON(http.StatusCreated, l)
}

func (h *LocalHandler) Update(c *gin.Context) {
	idLocal, err := strconv.Atoi(c.Param("id_local"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_local inválido"})
		return
	}

	var req localRequest
	if !leerJSON(c, &req) {
		return
	}

	horarioJSON := buildHorarioJSON(req)

	var l models.Local
	err = h.DB.QueryRow(
		c.Request.Context(),
		`UPDATE local SET nombre = $1, direccion = $2, telefono = $3, horario = $4::jsonb
		 WHERE id_local = $5 AND id_restaurante = $6
		 RETURNING `+localColumns,
		req.Nombre, req.Direccion, req.Telefono, horarioJSON,
		idLocal, currentRestauranteID(c),
	).Scan(
		&l.IDLocal, &l.IDRestaurante, &l.IDMenu, &l.Nombre, &l.Slug,
		&l.Direccion, &l.Telefono, &l.Horario, &l.Activo, &l.FechaRegistro,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "local no encontrado"})
		return
	}

	c.JSON(http.StatusOK, l)
}

// ReplicarCarta copia el contenido del borrador del local origen al borrador
// del local destino. Ambos deben pertenecer al mismo restaurante.
func (h *LocalHandler) ReplicarCarta(c *gin.Context) {
	idLocalDestino, err := strconv.Atoi(c.Param("id_local"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_local inválido"})
		return
	}
	var req struct {
		IDLocalOrigen int `json:"id_local_origen" binding:"required"`
	}
	if !leerJSON(c, &req) {
		return
	}

	idRestaurante := currentRestauranteID(c)
	ctx := c.Request.Context()

	// Obtener contenido del borrador del local origen
	var contenido []byte
	err = h.DB.QueryRow(ctx,
		`SELECT mv.contenido
		 FROM menu_version mv
		 JOIN menu m ON m.id_menu = mv.id_menu
		 JOIN local l ON l.id_menu = m.id_menu
		 WHERE l.id_local = $1 AND l.id_restaurante = $2 AND mv.estado = 'borrador'`,
		req.IDLocalOrigen, idRestaurante,
	).Scan(&contenido)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no se encontró carta del local origen"})
		return
	}

	// Aplicar al borrador del local destino
	tag, err := h.DB.Exec(ctx,
		`UPDATE menu_version mv SET contenido = $1
		 FROM menu m
		 JOIN local l ON l.id_menu = m.id_menu
		 WHERE mv.id_menu = m.id_menu AND mv.estado = 'borrador'
		   AND l.id_local = $2 AND l.id_restaurante = $3`,
		contenido, idLocalDestino, idRestaurante,
	)
	if err != nil || tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no se encontró borrador del local destino"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *LocalHandler) Delete(c *gin.Context) {
	idLocal, err := strconv.Atoi(c.Param("id_local"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_local inválido"})
		return
	}

	tag, err := h.DB.Exec(
		c.Request.Context(),
		"UPDATE local SET activo = false WHERE id_local = $1 AND id_restaurante = $2",
		idLocal, currentRestauranteID(c),
	)
	if err != nil {
		responderError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "local no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
