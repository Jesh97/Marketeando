"""Reenvía al backend las notificaciones de Yape del celular que recibe los pagos.

Yape no tiene API para cuentas personales: este script lee la bandeja de
notificaciones de Android (con Termux + Termux:API) y manda cada notificación
de Yape a POST /api/webhooks/yape. El backend interpreta el texto, encuentra
el pago que estaba esperando ese monto y activa el plan del restaurante.

Uso en el celular (ver scripts/README.md):

    export KK_BACKEND_URL="http://192.168.1.50:8080"
    export KK_YAPE_SECRET="<YAPE_WEBHOOK_SECRET del backend/.env>"
    python yape_notificaciones.py

No hace falta instalar nada con pip: solo usa la biblioteca estándar.
"""

import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

BACKEND_URL = os.environ.get("KK_BACKEND_URL", "").rstrip("/")
SECRET = os.environ.get("KK_YAPE_SECRET", "")
INTERVALO_SEGUNDOS = int(os.environ.get("KK_INTERVALO", "4"))
ARCHIVO_ENVIADAS = os.path.expanduser("~/.yape_enviadas.json")

# Paquete de la app de Yape en Android. Por si cambia, también se aceptan las
# notificaciones cuyo título sea el de un pago recibido.
PAQUETE_YAPE = "com.bcp.innovacxion.yapeapp"
TITULO_PAGO = "confirmación de pago"


def log(mensaje):
    print(time.strftime("%H:%M:%S"), mensaje, flush=True)


def leer_notificaciones():
    salida = subprocess.run(
        ["termux-notification-list"], capture_output=True, text=True, timeout=30
    )
    if salida.returncode != 0:
        raise RuntimeError(salida.stderr.strip() or "termux-notification-list falló")
    return json.loads(salida.stdout or "[]")


def es_de_yape(notif):
    paquete = (notif.get("packageName") or "").lower()
    titulo = (notif.get("title") or "").lower()
    return paquete == PAQUETE_YAPE or "yape" in paquete or TITULO_PAGO in titulo


def huella(notif):
    base = f"{notif.get('key')}|{notif.get('when')}|{notif.get('content')}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def cargar_enviadas():
    try:
        with open(ARCHIVO_ENVIADAS, encoding="utf-8") as f:
            return set(json.load(f))
    except (OSError, ValueError):
        return set()


def guardar_enviadas(enviadas):
    # Solo las últimas 500: el backend también descarta duplicados.
    with open(ARCHIVO_ENVIADAS, "w", encoding="utf-8") as f:
        json.dump(list(enviadas)[-500:], f)


def enviar(notif):
    cuando = notif.get("when")
    if isinstance(cuando, str):
        # Termux devuelve "when" como fecha en texto; el backend solo lo usa
        # para distinguir notificaciones, así que basta un número estable.
        cuando = int(hashlib.sha256(cuando.encode("utf-8")).hexdigest()[:12], 16)

    cuerpo = json.dumps(
        {
            "texto": notif.get("content") or "",
            "titulo": notif.get("title") or "",
            "clave": str(notif.get("key") or notif.get("id") or ""),
            "cuando": int(cuando or 0),
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        BACKEND_URL + "/api/webhooks/yape",
        data=cuerpo,
        method="POST",
        headers={"Content-Type": "application/json", "X-Yape-Secret": SECRET},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read() or b"{}")


def main():
    if not BACKEND_URL or not SECRET:
        sys.exit("Configura KK_BACKEND_URL y KK_YAPE_SECRET antes de iniciar (ver scripts/README.md).")

    enviadas = cargar_enviadas()
    log(f"Escuchando notificaciones de Yape -> {BACKEND_URL} (cada {INTERVALO_SEGUNDOS}s)")

    while True:
        try:
            for notif in leer_notificaciones():
                if not es_de_yape(notif) or not notif.get("content"):
                    continue
                h = huella(notif)
                if h in enviadas:
                    continue
                try:
                    r = enviar(notif)
                except urllib.error.HTTPError as e:
                    if e.code == 401:
                        log("El backend rechazó la clave: revisa KK_YAPE_SECRET.")
                    else:
                        log(f"Error {e.code} del backend; se reintentará.")
                    continue
                enviadas.add(h)
                guardar_enviadas(enviadas)
                if r.get("resultado") != "ignorada":
                    log(f"S/ {r.get('monto', '?')} -> {r.get('resultado')}  ({notif.get('content')})")
        except (urllib.error.URLError, OSError) as e:
            log(f"Sin conexión con el backend ({e}); se reintentará.")
        except Exception as e:  # noqa: BLE001 - el script no debe morir nunca
            log(f"Error inesperado: {e}")
        time.sleep(INTERVALO_SEGUNDOS)


if __name__ == "__main__":
    main()
