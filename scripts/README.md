# Cobro con Yape: script del celular

`yape_notificaciones.py` corre en el celular Android que recibe los yapeos.
Lee las notificaciones de Yape ("X te envió un pago por S/ 75.37. El cód. de
seguridad es: 459") y las reenvía al backend (`POST /api/webhooks/yape`), que
activa el plan del restaurante que estaba esperando ese monto exacto.

## Instalación (una sola vez)

1. Instala desde **F-Droid** (no desde Play Store, esas versiones están desactualizadas):
   - **Termux**
   - **Termux:API**
2. Abre Termux y ejecuta:
   ```
   pkg update
   pkg install python termux-api
   termux-setup-storage
   ```
3. Dale a **Termux:API** permiso de *acceso a notificaciones*:
   Ajustes → Aplicaciones → Acceso especial → Acceso a notificaciones → Termux:API.
4. Prueba que funciona: `termux-notification-list` debe mostrar tus notificaciones en JSON.
5. Copia `yape_notificaciones.py` al celular (por ejemplo a `Descargas`) y en Termux:
   ```
   cp ~/storage/downloads/yape_notificaciones.py ~/
   ```

## Configuración

`KK_YAPE_SECRET` es el valor de `YAPE_WEBHOOK_SECRET` en `backend/.env`. No lo
compartas ni lo subas a git: con él cualquiera podría activar planes.

`KK_BACKEND_URL` es la dirección del backend vista **desde el celular**:
- En desarrollo: la IP de tu PC en la misma red Wi-Fi (`ipconfig` en Windows),
  por ejemplo `http://192.168.1.50:8080`. Puede que haya que permitir el
  puerto 8080 en el Firewall de Windows.
- En producción: la URL pública del backend (`https://...`).

```
echo 'export KK_BACKEND_URL="http://192.168.1.50:8080"' >> ~/.bashrc
echo 'export KK_YAPE_SECRET="pega-aqui-el-secreto"' >> ~/.bashrc
source ~/.bashrc
```

## Uso

```
termux-wake-lock          # evita que Android duerma Termux
python yape_notificaciones.py
```

Deja Termux abierto en segundo plano. Para que Android no lo cierre, quita la
optimización de batería a Termux y Termux:API (Ajustes → Batería).

## Si algo falla

- **El pago no se confirma solo:** el restaurante puede confirmarlo con el
  código de seguridad de su comprobante (botón "¿Ya pagaste y no se confirma?").
  Las notificaciones que no se pudieron asignar quedan en la tabla
  `yape_notificacion` con `id_pago` vacío.
- **Yape cambió el texto de la notificación:** se ajusta
  `backend/internal/yape/notificacion.go` (tiene pruebas en `notificacion_test.go`).
