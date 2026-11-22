package main

import (
	"log"
	"net/http"
	"os"

	"alfio/backend/internal/client"
	"alfio/backend/internal/db"
	"alfio/backend/internal/security"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbCfg := db.LoadConfigFromEnv()

	gormDB, err := db.NewPostgresDB(dbCfg)
	if err != nil {
		log.Fatalf("error conectando a PostgreSQL: %v", err)
	}

	if err := gormDB.AutoMigrate(&client.Client{}); err != nil {
		log.Fatalf("error ejecutando AutoMigrate: %v", err)
	}

	// Cableado por capas del feature client
	clientRepo := client.NewRepository(gormDB)
	clientService := client.NewService(clientRepo)
	clientController := client.NewController(clientService)

	router := gin.Default()
	router.Use(security.SecurityHeadersMiddleware())
	router.Use(security.CORSMiddleware())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "alfio-backend"})
	})

	v1 := router.Group("/api/v1")
	client.RegisterRoutes(v1, clientController)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("alFio backend escuchando en :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("error iniciando servidor HTTP: %v", err)
	}
}
