package producto

import "github.com/gin-gonic/gin"

func RegisterRoutes(rg *gin.RouterGroup, ctrl Controller) {
	productos := rg.Group("/productos")
	{
		productos.POST("", ctrl.Create)
		productos.GET("", ctrl.List)
		productos.GET("/:id", ctrl.GetByID)
		productos.GET("/tienda/:tienda_id", ctrl.ListByTiendaID)
		productos.PUT("/:id", ctrl.Update)
		productos.DELETE("/:id", ctrl.Delete)
	}
}

// RegisterPublicQRRoute expone /p/:id para que al escanear el QR devuelva el producto.
func RegisterPublicQRRoute(router *gin.Engine, ctrl Controller) {
	router.GET("/p/:id", ctrl.GetByID)
}
