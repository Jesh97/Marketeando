package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/validacion"
)

func routerDeProductos(db *pgxpool.Pool, idRestaurante int) *gin.Engine {
	validacion.Registrar()
	gin.SetMode(gin.TestMode)
	h := NewProductoHandler(db, "")

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(ContextRestauranteKey, idRestaurante)
		c.Next()
	})
	r.POST("/productos", h.Create)
	r.DELETE("/productos/:id_producto", h.Delete)
	return r
}

func crearPlato(router *gin.Engine) *httptest.ResponseRecorder {
	body := bytes.NewBufferString(`{"nombre":"Arroz con pato","precio":25}`)
	req := httptest.NewRequest(http.MethodPost, "/productos", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func TestPaywall_PlanGratisBloqueaAlSuperarElLimite(t *testing.T) {
	db := connectTestDB(t)
	t.Cleanup(db.Close)

	idRestaurante := setUpRestauranteConPlan(t, db, "Básico")
	router := routerDeProductos(db, idRestaurante)

	var limite int
	if err := db.QueryRow(context.Background(),
		"SELECT max_producto FROM plan WHERE nombre = 'Básico'").Scan(&limite); err != nil {
		t.Fatalf("leer límite: %v", err)
	}

	var ultimoID int
	for i := 0; i < limite; i++ {
		w := crearPlato(router)
		if w.Code != http.StatusCreated {
			t.Fatalf("plato %d de %d: esperaba 201, obtuve %d: %s", i+1, limite, w.Code, w.Body.String())
		}
		var creado struct {
			IDProducto int `json:"id_producto"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &creado); err != nil {
			t.Fatalf("leer respuesta: %v", err)
		}
		ultimoID = creado.IDProducto
	}

	w := crearPlato(router)
	if w.Code != http.StatusForbidden {
		t.Fatalf("esperaba 403 al superar el límite, obtuve %d: %s", w.Code, w.Body.String())
	}
	var rechazo struct {
		Codigo      string `json:"codigo"`
		MaxProducto int    `json:"max_producto"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &rechazo); err != nil {
		t.Fatalf("leer rechazo: %v", err)
	}
	if rechazo.Codigo != "limite_platos" || rechazo.MaxProducto != limite {
		t.Fatalf("rechazo inesperado: %s", w.Body.String())
	}

	// Un plato eliminado libera su cupo.
	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/productos/%d", ultimoID), nil)
	borrado := httptest.NewRecorder()
	router.ServeHTTP(borrado, req)
	if borrado.Code != http.StatusNoContent {
		t.Fatalf("esperaba 204 al eliminar, obtuve %d", borrado.Code)
	}
	if w := crearPlato(router); w.Code != http.StatusCreated {
		t.Fatalf("esperaba 201 tras liberar cupo, obtuve %d: %s", w.Code, w.Body.String())
	}
}

func TestPaywall_PlanPagadoNoTieneLimite(t *testing.T) {
	db := connectTestDB(t)
	t.Cleanup(db.Close)

	idRestaurante := setUpRestauranteConPlan(t, db, "Pro")
	router := routerDeProductos(db, idRestaurante)

	for i := 0; i < 20; i++ {
		if w := crearPlato(router); w.Code != http.StatusCreated {
			t.Fatalf("plato %d: esperaba 201, obtuve %d: %s", i+1, w.Code, w.Body.String())
		}
	}
}

func TestClicMarcaAgua(t *testing.T) {
	db := connectTestDB(t)
	t.Cleanup(db.Close)
	ctx := context.Background()

	idRestaurante := setUpRestauranteConPlan(t, db, "Básico")
	var subdominio string
	if err := db.QueryRow(ctx,
		"SELECT subdominio FROM restaurante WHERE id_restaurante = $1", idRestaurante).Scan(&subdominio); err != nil {
		t.Fatalf("leer subdominio: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/public/menu/:subdominio/clic-marca-agua", NewPublicHandler(db).ClicMarcaAgua)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/public/menu/"+subdominio+"/clic-marca-agua", nil))
	if w.Code != http.StatusNoContent {
		t.Fatalf("esperaba 204, obtuve %d: %s", w.Code, w.Body.String())
	}

	var total int
	if err := db.QueryRow(ctx,
		"SELECT count(*) FROM clic_marca_agua WHERE id_restaurante = $1", idRestaurante).Scan(&total); err != nil {
		t.Fatalf("contar clics: %v", err)
	}
	if total != 1 {
		t.Fatalf("esperaba 1 clic registrado, hay %d", total)
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/public/menu/no-existe-xyz/clic-marca-agua", nil))
	if w.Code != http.StatusNotFound {
		t.Fatalf("esperaba 404 con subdominio inexistente, obtuve %d", w.Code)
	}
}
