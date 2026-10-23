package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/auth"
	"marketeando/backend/internal/validacion"
)

const ContextRestauranteKey = "id_restaurante"

func currentUserID(c *gin.Context) int {
	return c.GetInt(auth.ContextUserKey)
}

func currentRestauranteID(c *gin.Context) int {
	return c.GetInt(ContextRestauranteKey)
}

// RequireOwnRestaurante valida que :id_restaurante en la URL exista y
// pertenezca al usuario autenticado, y lo deja en el contexto.
func RequireOwnRestaurante(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idRestaurante, err := strconv.Atoi(c.Param("id_restaurante"))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "id_restaurante inválido"})
			return
		}

		var idUsuario int
		err = db.QueryRow(
			c.Request.Context(),
			"SELECT id_usuario FROM restaurante WHERE id_restaurante = $1 AND activo",
			idRestaurante,
		).Scan(&idUsuario)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "restaurante no encontrado"})
			return
		}

		if idUsuario != currentUserID(c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no tienes acceso a este restaurante"})
			return
		}

		c.Set(ContextRestauranteKey, idRestaurante)
		c.Next()
	}
}

// RequirePlan exige que el restaurante (ya resuelto por RequireOwnRestaurante)
// tenga una suscripción activa en el plan indicado; usa la misma vista
// v_plan_restaurante que el resto de los chequeos de plan (ver MenuHandler.Create).
func RequirePlan(db *pgxpool.Pool, nombrePlan string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var plan string
		err := db.QueryRow(
			c.Request.Context(),
			"SELECT plan FROM v_plan_restaurante WHERE id_restaurante = $1",
			currentRestauranteID(c),
		).Scan(&plan)
		if err != nil || plan != nombrePlan {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "esta función requiere el plan " + nombrePlan,
			})
			return
		}
		c.Next()
	}
}

// leerJSON lee y valida el body (ver validacion.Leer). Si algo falla ya
// respondió 400 con un mensaje para el usuario y devuelve false.
func leerJSON(c *gin.Context, obj any) bool {
	if err := validacion.Leer(c.Request.Body, obj); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return false
	}
	return true
}

// responderError responde un error de la base de datos sin exponer el
// detalle técnico al usuario; los inesperados se dejan en el log.
func responderError(c *gin.Context, err error) {
	status, mensaje := validacion.ErrorBD(err)
	if status >= http.StatusInternalServerError {
		log.Printf("%s %s: %v", c.Request.Method, c.FullPath(), err)
	}
	c.AbortWithStatusJSON(status, gin.H{"error": mensaje})
}
