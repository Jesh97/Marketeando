package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PublicHandler struct {
	DB *pgxpool.Pool
}

func NewPublicHandler(db *pgxpool.Pool) *PublicHandler {
	return &PublicHandler{DB: db}
}

// MenuPorSubdominio es lo que resuelve <subdominio>.kartakamay.app: el
// restaurante, su menú principal publicado y los productos que referencia.
func (h *PublicHandler) MenuPorSubdominio(c *gin.Context) {
	subdominio := c.Param("subdominio")
	ctx := c.Request.Context()

	var idRestaurante int
	var nombre, zonaHoraria string
	var slogan, urlLogo *string
	err := h.DB.QueryRow(ctx,
		`SELECT id_restaurante, nombre, slogan, url_logo, zona_horaria
		 FROM restaurante WHERE subdominio = $1 AND activo`,
		subdominio,
	).Scan(&idRestaurante, &nombre, &slogan, &urlLogo, &zonaHoraria)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "restaurante no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var idMenu int
	var contenido []byte
	err = h.DB.QueryRow(ctx,
		`SELECT m.id_menu, mv.contenido
		 FROM menu m
		 JOIN menu_version mv ON mv.id_menu = m.id_menu AND mv.estado = 'publicada'
		 WHERE m.id_restaurante = $1 AND m.es_principal AND m.activo`,
		idRestaurante,
	).Scan(&idMenu, &contenido)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "este restaurante todavía no publicó su menú"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	origen := c.DefaultQuery("origen", "link")
	if origen != "qr" {
		origen = "link"
	}
	_, _ = h.DB.Exec(ctx,
		"INSERT INTO visita_menu (id_restaurante, origen) VALUES ($1, $2)",
		idRestaurante, origen,
	)

	type productoPublico struct {
		IDProducto  int      `json:"id_producto"`
		IDCategoria *int     `json:"id_categoria"`
		Categoria   *string  `json:"categoria"`
		Nombre      string   `json:"nombre"`
		Descripcion *string  `json:"descripcion"`
		Precio      float64  `json:"precio"`
		URLImagen   *string  `json:"url_imagen"`
		Agotado     bool     `json:"agotado"`
		Etiquetas   []string `json:"etiquetas"`
	}

	rows, err := h.DB.Query(ctx,
		`SELECT p.id_producto, p.id_categoria, cat.nombre, p.nombre, p.descripcion, p.precio,
		        p.url_imagen, p.agotado,
		        COALESCE(array_agg(e.codigo) FILTER (WHERE e.codigo IS NOT NULL), '{}')
		 FROM producto p
		 LEFT JOIN categoria cat ON cat.id_categoria = p.id_categoria
		 LEFT JOIN producto_etiqueta pe ON pe.id_producto = p.id_producto
		 LEFT JOIN etiqueta e ON e.id_etiqueta = pe.id_etiqueta
		 WHERE p.id_restaurante = $1 AND p.activo
		 GROUP BY p.id_producto, cat.nombre, cat.orden
		 ORDER BY cat.orden, p.nombre`,
		idRestaurante,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	productos := []productoPublico{}
	for rows.Next() {
		var p productoPublico
		if err := rows.Scan(&p.IDProducto, &p.IDCategoria, &p.Categoria, &p.Nombre, &p.Descripcion,
			&p.Precio, &p.URLImagen, &p.Agotado, &p.Etiquetas); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		productos = append(productos, p)
	}

	c.JSON(http.StatusOK, gin.H{
		"restaurante": gin.H{
			"id_restaurante": idRestaurante,
			"nombre":         nombre,
			"slogan":         slogan,
			"url_logo":       urlLogo,
			"zona_horaria":   zonaHoraria,
		},
		"id_menu":   idMenu,
		"contenido": json.RawMessage(contenido),
		"productos": productos,
	})
}
