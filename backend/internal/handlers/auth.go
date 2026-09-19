package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/auth"
	"marketeando/backend/internal/models"
)

type AuthHandler struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

func NewAuthHandler(db *pgxpool.Pool, jwtSecret string) *AuthHandler {
	return &AuthHandler{DB: db, JWTSecret: jwtSecret}
}

type registroRequest struct {
	Correo     string `json:"correo" binding:"required,email"`
	Contrasena string `json:"contrasena" binding:"required,min=8"`
	Nombre     string `json:"nombre" binding:"required"`
}

func (h *AuthHandler) Registro(c *gin.Context) {
	var req registroRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	correo := strings.ToLower(strings.TrimSpace(req.Correo))

	hash, err := auth.HashPassword(req.Contrasena)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo procesar la contraseña"})
		return
	}

	var idUsuario int
	err = h.DB.QueryRow(
		c.Request.Context(),
		"INSERT INTO usuario (correo, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id_usuario",
		correo, hash, req.Nombre,
	).Scan(&idUsuario)
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "ya existe una cuenta con ese correo"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	token, err := auth.GenerateToken(h.JWTSecret, idUsuario)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo generar el token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"token": token})
}

type loginRequest struct {
	Correo     string `json:"correo" binding:"required,email"`
	Contrasena string `json:"contrasena" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	correo := strings.ToLower(strings.TrimSpace(req.Correo))

	var idUsuario int
	var hash string
	var activo bool
	err := h.DB.QueryRow(
		c.Request.Context(),
		"SELECT id_usuario, password_hash, activo FROM usuario WHERE correo = $1",
		correo,
	).Scan(&idUsuario, &hash, &activo)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "correo o contraseña incorrectos"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !activo || !auth.CheckPassword(hash, req.Contrasena) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "correo o contraseña incorrectos"})
		return
	}

	token, err := auth.GenerateToken(h.JWTSecret, idUsuario)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo generar el token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) Me(c *gin.Context) {
	idUsuario := currentUserID(c)

	var usuario models.Usuario
	err := h.DB.QueryRow(
		c.Request.Context(),
		"SELECT id_usuario, correo, nombre, activo, fecha_registro FROM usuario WHERE id_usuario = $1",
		idUsuario,
	).Scan(&usuario.IDUsuario, &usuario.Correo, &usuario.Nombre, &usuario.Activo, &usuario.FechaRegistro)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuario no encontrado"})
		return
	}

	c.JSON(http.StatusOK, usuario)
}

func isUniqueViolation(err error) bool {
	return strings.Contains(err.Error(), "SQLSTATE 23505")
}
