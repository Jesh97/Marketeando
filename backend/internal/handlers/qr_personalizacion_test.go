package handlers

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// setUpRestauranteConPlan crea un usuario + restaurante + suscripción activa
// en el plan indicado, y devuelve una función de limpieza (respeta el
// ON DELETE RESTRICT de suscripcion -> restaurante -> usuario).
func setUpRestauranteConPlan(t *testing.T, db *pgxpool.Pool, nombrePlan string) int {
	t.Helper()
	ctx := context.Background()

	var idUsuario int
	err := db.QueryRow(ctx,
		"INSERT INTO usuario (correo, password_hash, nombre) VALUES ($1, 'x', 'test') RETURNING id_usuario",
		strings.ToLower("qr-test-"+nombrePlan+"-"+time.Now().Format("150405.000")+"@test.dev"),
	).Scan(&idUsuario)
	if err != nil {
		t.Fatalf("crear usuario de prueba: %v", err)
	}

	var idRestaurante int
	err = db.QueryRow(ctx,
		"INSERT INTO restaurante (id_usuario, nombre, subdominio) VALUES ($1, 'Test', $2) RETURNING id_restaurante",
		idUsuario, fmt.Sprintf("qr-test-%d", time.Now().UnixNano()),
	).Scan(&idRestaurante)
	if err != nil {
		t.Fatalf("crear restaurante de prueba: %v", err)
	}

	var idPlan int
	if err := db.QueryRow(ctx, "SELECT id_plan FROM plan WHERE nombre = $1", nombrePlan).Scan(&idPlan); err != nil {
		t.Fatalf("plan %q no existe en la base de pruebas: %v", nombrePlan, err)
	}

	inicio := time.Now()
	fin := inicio.AddDate(0, 1, 0)
	if _, err := db.Exec(ctx,
		`INSERT INTO suscripcion (id_restaurante, id_plan, metodo_pago, estado, fecha_inicio, fecha_fin, renueva_en)
		 VALUES ($1, $2, 'yape', 'activa', $3, $4, $5)`,
		idRestaurante, idPlan, inicio, fin, fin,
	); err != nil {
		t.Fatalf("crear suscripcion de prueba: %v", err)
	}

	t.Cleanup(func() {
		db.Exec(ctx, "DELETE FROM suscripcion WHERE id_restaurante = $1", idRestaurante)
		db.Exec(ctx, "DELETE FROM restaurante WHERE id_restaurante = $1", idRestaurante)
		db.Exec(ctx, "DELETE FROM usuario WHERE id_usuario = $1", idUsuario)
	})

	return idRestaurante
}

func connectTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:070905@localhost:5433/Marketeando?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("conectar a la base de pruebas: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		t.Skipf("base de datos de pruebas no disponible, se omite: %v", err)
	}
	return pool
}

// routerParaRestaurante monta solo lo necesario para probar el gate de plan:
// inyecta id_restaurante en el contexto (como haría RequireOwnRestaurante ya
// probado en su propio flujo) y aplica RequirePlan delante del handler real.
func routerParaRestaurante(db *pgxpool.Pool, uploadDir string, idRestaurante int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := NewQRPersonalizacionHandler(db, uploadDir)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(ContextRestauranteKey, idRestaurante)
		c.Next()
	})
	qr := r.Group("/qr-personalizacion")
	qr.Use(RequirePlan(db, "Enterprise"))
	{
		qr.GET("", h.Get)
		qr.PUT("", h.Update)
		qr.POST("/logo", h.SubirLogo)
	}
	return r
}

func TestRequirePlan_RechazaGuardarSinEnterprise(t *testing.T) {
	db := connectTestDB(t)
	defer db.Close()

	idRestaurante := setUpRestauranteConPlan(t, db, "Pro")
	router := routerParaRestaurante(db, t.TempDir(), idRestaurante)

	body := bytes.NewBufferString(`{"modo":"classic","colores":{"puntos":"#000","fondo":"#fff"},"sensibilidad":128}`)
	req := httptest.NewRequest(http.MethodPut, "/qr-personalizacion", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("esperaba 403 guardando config sin plan Enterprise, obtuve %d: %s", w.Code, w.Body.String())
	}
}

func TestRequirePlan_RechazaSubirLogoSinEnterprise(t *testing.T) {
	db := connectTestDB(t)
	defer db.Close()

	idRestaurante := setUpRestauranteConPlan(t, db, "Pro")
	router := routerParaRestaurante(db, t.TempDir(), idRestaurante)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	part, _ := mw.CreateFormFile("file", "logo.png")
	part.Write([]byte("\x89PNG\r\n\x1a\n fake"))
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/qr-personalizacion/logo", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("esperaba 403 subiendo logo sin plan Enterprise, obtuve %d: %s", w.Code, w.Body.String())
	}
}

func TestRequirePlan_PermiteGuardarConEnterprise(t *testing.T) {
	db := connectTestDB(t)
	defer db.Close()

	idRestaurante := setUpRestauranteConPlan(t, db, "Enterprise")
	router := routerParaRestaurante(db, t.TempDir(), idRestaurante)

	body := bytes.NewBufferString(`{"modo":"color","colores":{"puntos":"#000","fondo":"#fff"},"sensibilidad":100}`)
	req := httptest.NewRequest(http.MethodPut, "/qr-personalizacion", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("esperaba 200 guardando config con plan Enterprise, obtuve %d: %s", w.Code, w.Body.String())
	}
}

func TestRequirePlan_ConservaConfigTrasBajaDePlan(t *testing.T) {
	db := connectTestDB(t)
	defer db.Close()
	ctx := context.Background()

	idRestaurante := setUpRestauranteConPlan(t, db, "Enterprise")
	router := routerParaRestaurante(db, t.TempDir(), idRestaurante)

	body := bytes.NewBufferString(`{"modo":"halftone","colores":{"puntos":"#123456","fondo":"#fff"},"sensibilidad":90}`)
	req := httptest.NewRequest(http.MethodPut, "/qr-personalizacion", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("setup: no se pudo guardar config inicial: %d %s", w.Code, w.Body.String())
	}

	// Simula la baja de plan: la suscripción deja de estar activa.
	if _, err := db.Exec(ctx, "UPDATE suscripcion SET estado = 'cancelada' WHERE id_restaurante = $1", idRestaurante); err != nil {
		t.Fatalf("cancelar suscripcion: %v", err)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/qr-personalizacion", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusForbidden {
		t.Fatalf("esperaba 403 tras bajar de plan, obtuve %d: %s", w2.Code, w2.Body.String())
	}

	var modo string
	if err := db.QueryRow(ctx, "SELECT modo FROM qr_personalizacion WHERE id_restaurante = $1", idRestaurante).Scan(&modo); err != nil {
		t.Fatalf("la configuración no debería borrarse al bajar de plan: %v", err)
	}
	if modo != "halftone" {
		t.Fatalf("esperaba que la config guardada se conservara (halftone), quedó %q", modo)
	}
}
