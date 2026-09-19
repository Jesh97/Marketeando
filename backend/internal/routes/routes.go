package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketeando/backend/internal/auth"
	"marketeando/backend/internal/handlers"
)

func Register(router *gin.Engine, db *pgxpool.Pool, jwtSecret string, uploadDir string) {
	campaignHandler := handlers.NewCampaignHandler(db)
	authHandler := handlers.NewAuthHandler(db, jwtSecret)
	restauranteHandler := handlers.NewRestauranteHandler(db)
	categoriaHandler := handlers.NewCategoriaHandler(db)
	productoHandler := handlers.NewProductoHandler(db)
	menuHandler := handlers.NewMenuHandler(db)
	planHandler := handlers.NewPlanHandler(db)
	suscripcionHandler := handlers.NewSuscripcionHandler(db)
	publicHandler := handlers.NewPublicHandler(db)
	editorHandler := handlers.NewEditorHandler(db, uploadDir)

	api := router.Group("/api")
	{
		api.GET("/health", handlers.Health)

		campaigns := api.Group("/campaigns")
		{
			campaigns.GET("", campaignHandler.List)
			campaigns.POST("", campaignHandler.Create)
		}

		// --- Público (sin token) ---
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/registro", authHandler.Registro)
			authGroup.POST("/login", authHandler.Login)
		}
		api.GET("/planes", planHandler.List)
		api.GET("/public/menu/:subdominio", publicHandler.MenuPorSubdominio)

		// --- Requiere sesión (Authorization: Bearer <token>) ---
		protected := api.Group("")
		protected.Use(auth.RequireAuth(jwtSecret))
		{
			protected.GET("/auth/me", authHandler.Me)

			restaurantes := protected.Group("/restaurantes")
			{
				restaurantes.GET("", restauranteHandler.List)
				restaurantes.POST("", restauranteHandler.Create)
			}

			// Todo lo que cuelga de un restaurante puntual valida antes que
			// pertenezca al usuario autenticado.
			mio := restaurantes.Group("/:id_restaurante")
			mio.Use(handlers.RequireOwnRestaurante(db))
			{
				mio.GET("", restauranteHandler.Get)
				mio.PUT("", restauranteHandler.Update)
				mio.GET("/dashboard", restauranteHandler.Dashboard)

				categorias := mio.Group("/categorias")
				{
					categorias.GET("", categoriaHandler.List)
					categorias.POST("", categoriaHandler.Create)
					categorias.PUT("/:id_categoria", categoriaHandler.Update)
					categorias.DELETE("/:id_categoria", categoriaHandler.Delete)
				}

				productos := mio.Group("/productos")
				{
					productos.GET("", productoHandler.List)
					productos.POST("", productoHandler.Create)
					productos.PUT("/:id_producto", productoHandler.Update)
					productos.PATCH("/:id_producto/agotado", productoHandler.ToggleAgotado)
					productos.DELETE("/:id_producto", productoHandler.Delete)
				}

				menus := mio.Group("/menus")
				{
					menus.GET("", menuHandler.List)
					menus.POST("", menuHandler.Create)
					menus.GET("/:id_menu/borrador", menuHandler.Borrador)
					menus.PUT("/:id_menu/borrador", menuHandler.GuardarBorrador)
					menus.POST("/:id_menu/publicar", menuHandler.Publicar)
				}

				suscripcion := mio.Group("/suscripcion")
				{
					suscripcion.GET("", suscripcionHandler.Get)
					suscripcion.POST("", suscripcionHandler.Suscribir)
					suscripcion.GET("/facturas", suscripcionHandler.Facturas)
				}
			}

			// Editor visual (estilo Canva): documentos de diseño libre del
			// usuario, independientes de un restaurante puntual.
			editor := protected.Group("/editor")
			{
				editor.GET("", editorHandler.List)
				editor.POST("/upload", editorHandler.Upload)
				editor.POST("/save", editorHandler.Save)
				editor.GET("/:id", editorHandler.Get)
				editor.DELETE("/:id", editorHandler.Delete)
			}
		}
	}
}
