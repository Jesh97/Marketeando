package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const ContextUserKey = "id_usuario"

// RequireAuth exige un header "Authorization: Bearer <token>" válido y deja
// el id_usuario en el contexto de Gin para que los handlers lo lean con
// c.GetInt(auth.ContextUserKey).
func RequireAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "falta el token de autenticación"})
			return
		}

		claims, err := ParseToken(secret, parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token inválido o expirado"})
			return
		}

		c.Set(ContextUserKey, claims.IDUsuario)
		c.Next()
	}
}
