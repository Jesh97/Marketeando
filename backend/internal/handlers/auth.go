package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

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

	ctx := c.Request.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var idUsuario int
	err = tx.QueryRow(
		ctx,
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

	// Toda cuenta nueva llega con su restaurante y subdominio ya listos (sin
	// pasos manuales): así el Dashboard/Editor/QR tienen algo real desde el
	// primer login, y el subdominio no queda expuesto a que el usuario nunca
	// complete un formulario de "elige tu subdominio".
	subdominio, err := generarSubdominioUnico(ctx, tx, slugifyBase(req.Nombre))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var idRestaurante int
	err = tx.QueryRow(
		ctx,
		"INSERT INTO restaurante (id_usuario, nombre, subdominio) VALUES ($1, 'Mi Restaurante', $2) RETURNING id_restaurante",
		idUsuario, subdominio,
	).Scan(&idRestaurante)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Menú principal: sin esto no hay nada que publicar en el subdominio
	// (trg_menu_borrador_inicial le crea su primer borrador automáticamente,
	// con el tema por defecto de menu_version.contenido).
	if _, err := tx.Exec(
		ctx,
		"INSERT INTO menu (id_restaurante, nombre, es_principal) VALUES ($1, 'Menú principal', true)",
		idRestaurante,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Plan gratis de entrada: sin una suscripción activa el backend no deja
	// crear ni publicar el primer menú (ver MenuHandler.Create).
	var idPlanGratis int
	if err := tx.QueryRow(
		ctx, "SELECT id_plan FROM plan WHERE precio = 0 AND activo ORDER BY id_plan LIMIT 1",
	).Scan(&idPlanGratis); err == nil {
		inicio := time.Now()
		fin := inicio.AddDate(0, 1, 0)

		var idSuscripcion int
		err = tx.QueryRow(
			ctx,
			`INSERT INTO suscripcion (id_restaurante, id_plan, metodo_pago, estado, fecha_inicio, fecha_fin, renueva_en)
			 VALUES ($1, $2, 'otro', 'activa', $3, $4, $5) RETURNING id_suscripcion`,
			idRestaurante, idPlanGratis, inicio, fin, fin,
		).Scan(&idSuscripcion)
		if err == nil {
			_, _ = tx.Exec(
				ctx,
				`INSERT INTO factura (id_suscripcion, monto, estado, periodo_inicio, periodo_fin, fecha_pago)
				 VALUES ($1, 0, 'pagada', $2, $3, now())`,
				idSuscripcion, inicio, fin,
			)
		}
	}

	if err := tx.Commit(ctx); err != nil {
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
