// Package culqi envuelve al SDK oficial github.com/culqi/culqi-go (que solo
// trabaja con []byte/string crudos) en funciones tipadas para lo que necesita
// el backend: crear un cliente, guardar una tarjeta y cobrar. La tokenización
// de tarjeta/Yape ocurre siempre en el navegador con Culqi.js — a este
// paquete solo deben llegar tokens (tkn_/ype_), nunca números de tarjeta.
package culqi

import (
	"encoding/json"
	"fmt"
	"strings"

	sdk "github.com/culqi/culqi-go"
)

// Init configura la llave secreta del SDK. El SDK la guarda en un singleton
// de paquete, así que se llama una sola vez al arrancar el servidor. No se
// pasa llave pública porque el backend nunca llama a los endpoints que la
// necesitan (tokens/confirm se generan en el navegador).
func Init(secretKey string) {
	sdk.Key("", secretKey)
}

func dividirNombre(nombreCompleto string) (nombre, apellido string) {
	partes := strings.Fields(nombreCompleto)
	switch len(partes) {
	case 0:
		return "Cliente", "KartaKamay"
	case 1:
		return partes[0], "-"
	default:
		return partes[0], strings.Join(partes[1:], " ")
	}
}

type clienteRespuesta struct {
	ID string `json:"id"`
}

// CrearCliente registra un Cliente en Culqi, paso previo para poder guardar
// una tarjeta reutilizable. address/address_city son placeholders (no
// recolectamos dirección del restaurante) — Culqi los exige al crear el
// cliente pero no afectan la validación del cobro.
func CrearCliente(email, nombreCompleto, telefono string) (string, error) {
	nombre, apellido := dividirNombre(nombreCompleto)
	body, err := json.Marshal(map[string]any{
		"first_name":   nombre,
		"last_name":    apellido,
		"email":        email,
		"address":      "-",
		"address_city": "Lima",
		"country_code": "PE",
		"phone_number": telefono,
	})
	if err != nil {
		return "", err
	}

	_, res, err := sdk.CreateCustomer(body)
	if err != nil {
		return "", fmt.Errorf("culqi: no se pudo crear el cliente: %w", err)
	}

	var cliente clienteRespuesta
	if err := json.Unmarshal([]byte(res), &cliente); err != nil || cliente.ID == "" {
		return "", fmt.Errorf("culqi: respuesta de cliente inesperada: %q", res)
	}
	return cliente.ID, nil
}

type tarjetaRespuesta struct {
	ID     string `json:"id"`
	Source struct {
		LastFour string `json:"last_four"`
		IIN      struct {
			CardBrand string `json:"card_brand"`
		} `json:"iin"`
	} `json:"source"`
}

// GuardarTarjeta cambia un token de un solo uso (tkn_, generado por Culqi.js
// en el navegador) por una tarjeta guardada (crd_) asociada al cliente, que
// se puede volver a cobrar sin pedir los datos de la tarjeta otra vez.
func GuardarTarjeta(customerID, tokenID string) (cardID, marca, ultimos4 string, err error) {
	body, err := json.Marshal(map[string]any{
		"customer_id": customerID,
		"token_id":    tokenID,
	})
	if err != nil {
		return "", "", "", err
	}

	_, res, err := sdk.CreateCard(body)
	if err != nil {
		return "", "", "", fmt.Errorf("culqi: no se pudo guardar la tarjeta: %w", err)
	}

	var tarjeta tarjetaRespuesta
	if err := json.Unmarshal([]byte(res), &tarjeta); err != nil || tarjeta.ID == "" {
		return "", "", "", fmt.Errorf("culqi: respuesta de tarjeta inesperada: %q", res)
	}
	return tarjeta.ID, tarjeta.Source.IIN.CardBrand, tarjeta.Source.LastFour, nil
}

type cargoRespuesta struct {
	ID      string `json:"id"`
	Outcome struct {
		Type string `json:"type"`
	} `json:"outcome"`
}

// Cobrar crea un cargo real. sourceID puede ser una tarjeta guardada (crd_),
// un token de tarjeta de un solo uso (tkn_) o un token de Yape (ype_,
// generado con teléfono+OTP). capture=true porque no usamos captura diferida.
func Cobrar(montoCentavos int, sourceID, email, descripcion string) (chargeID string, err error) {
	body, err := json.Marshal(map[string]any{
		"amount":        montoCentavos,
		"capture":       true,
		"currency_code": "PEN",
		"email":         email,
		"source_id":     sourceID,
		"description":   descripcion,
	})
	if err != nil {
		return "", err
	}

	_, res, err := sdk.CreateCharge(body)
	if err != nil {
		return "", fmt.Errorf("culqi: no se pudo procesar el cobro: %w", err)
	}

	var cargo cargoRespuesta
	if err := json.Unmarshal([]byte(res), &cargo); err != nil || cargo.ID == "" {
		return "", fmt.Errorf("culqi: respuesta de cargo inesperada: %q", res)
	}
	if cargo.Outcome.Type != "" && cargo.Outcome.Type != "venta_exitosa" {
		return "", fmt.Errorf("culqi: cargo no aprobado (%s)", cargo.Outcome.Type)
	}
	return cargo.ID, nil
}

// EstadoCargo es lo mínimo que necesita el webhook para reconciliar.
type EstadoCargo struct {
	ID      string `json:"id"`
	Outcome struct {
		Type string `json:"type"`
	} `json:"outcome"`
}

// ConsultarCargo vuelve a pedirle el estado real de un cargo a la API de
// Culqi. Culqi no documenta públicamente el esquema de firma de sus
// webhooks, así que nunca confiamos en el body que llega — solo lo usamos
// para extraer el id y después verificamos su estado acá.
func ConsultarCargo(chargeID string) (*EstadoCargo, error) {
	_, res, err := sdk.GetByIdCharge(chargeID, nil)
	if err != nil {
		return nil, fmt.Errorf("culqi: no se pudo consultar el cargo: %w", err)
	}

	var estado EstadoCargo
	if err := json.Unmarshal([]byte(res), &estado); err != nil || estado.ID == "" {
		return nil, fmt.Errorf("culqi: respuesta de consulta inesperada: %q", res)
	}
	return &estado, nil
}
