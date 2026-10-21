package cloudinaryutil

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

var cld *cloudinary.Cloudinary

// Init inicializa el cliente global de Cloudinary. Debe llamarse una vez
// desde main antes de recibir requests.
func Init(cloudName, apiKey, apiSecret string) error {
	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return fmt.Errorf("credenciales de Cloudinary incompletas")
	}
	var err error
	cld, err = cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	return err
}

// Upload sube un archivo a Cloudinary dentro de la carpeta indicada y
// devuelve la URL segura (HTTPS). El caller es responsable de cerrar r.
func Upload(ctx context.Context, r io.Reader, folder string) (string, error) {
	if cld == nil {
		return "", fmt.Errorf("Cloudinary no está inicializado")
	}
	result, err := cld.Upload.Upload(ctx, r, uploader.UploadParams{
		Folder:         "kartakamay/" + folder,
		ResourceType:   "image",
		UniqueFilename: api.Bool(true),
		Overwrite:      api.Bool(false),
	})
	if err != nil {
		return "", err
	}
	return result.SecureURL, nil
}
