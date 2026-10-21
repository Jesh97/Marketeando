package handlers

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"marketeando/backend/internal/cloudinaryutil"
)

// subirImagen valida el archivo del campo "file", lo sube a Cloudinary
// dentro de la carpeta indicada y devuelve la URL pública.
// En caso de error escribe la respuesta HTTP y devuelve "".
func subirImagen(c *gin.Context, folder string) (url string, ok bool) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "falta el archivo (campo 'file')"})
		return "", false
	}
	if fileHeader.Size > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "la imagen supera los 10 MB"})
		return "", false
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no se pudo leer el archivo"})
		return "", false
	}
	defer file.Close()

	// Detectar content-type por los primeros 512 bytes
	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	contentType := http.DetectContentType(head[:n])

	if _, allowed := extensionesPermitidas[contentType]; !allowed {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"error": fmt.Sprintf("formato no soportado (%s). Usa PNG, JPG, WebP o GIF.", contentType),
		})
		return "", false
	}

	// Reconstruir el reader: cabecera + resto del archivo
	reader := io.MultiReader(bytes.NewReader(head[:n]), file)

	imageURL, err := cloudinaryutil.Upload(c.Request.Context(), reader, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudo subir la imagen: " + err.Error()})
		return "", false
	}

	return imageURL, true
}
