-- Cobro con Yape personal mientras no hay RUC para Culqi. No hay API de Yape
-- para cuentas personales: un script en el celular que recibe los pagos lee
-- la notificación de Yape ("X te envió un pago por S/ 75.37. El cód. de
-- seguridad es: 459") y la reenvía a /api/webhooks/yape.
--
-- Para saber de qué restaurante es cada yapeo, cada intento de pago recibe
-- un monto con céntimos únicos (plan S/ 75 -> S/ 75.37) entre los pagos que
-- están esperando: la notificación no trae el mensaje del yapeo, solo
-- nombre, monto y código de seguridad.

CREATE TABLE pago_yape (
  id_pago          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante   int            NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  id_plan          int            NOT NULL REFERENCES plan (id_plan) ON DELETE RESTRICT,
  monto            numeric(10, 2) NOT NULL CHECK (monto > 0),
  estado           varchar(15)    NOT NULL DEFAULT 'esperando'
                   CHECK (estado IN ('esperando', 'confirmado', 'expirado', 'cancelado')),
  -- Intentos fallidos de "ya pagué, este es mi código" (ver Reclamar), para
  -- que no se pueda adivinar el código de 3 dígitos de otro yapeo.
  intentos_reclamo int            NOT NULL DEFAULT 0,
  id_suscripcion   int            REFERENCES suscripcion (id_suscripcion) ON DELETE SET NULL,
  creado_en        timestamptz    NOT NULL DEFAULT now(),
  expira_en        timestamptz    NOT NULL,
  confirmado_en    timestamptz
);

CREATE INDEX ix_pago_yape_restaurante ON pago_yape (id_restaurante, creado_en DESC);
-- Dos pagos esperando nunca pueden compartir monto: es lo único que permite
-- asignar la notificación al restaurante correcto.
CREATE UNIQUE INDEX ux_pago_yape_monto_esperando ON pago_yape (monto) WHERE estado = 'esperando';

-- Cada notificación de Yape recibida, se haya podido asignar o no. Las que
-- quedan con id_pago NULL son yapeos que llegaron tarde o con otro monto:
-- el restaurante puede reclamarlas con el código de seguridad.
CREATE TABLE yape_notificacion (
  id_notificacion  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  remitente        varchar(100)   NOT NULL,
  monto            numeric(10, 2) NOT NULL CHECK (monto > 0),
  codigo_seguridad varchar(6),
  texto_original   text           NOT NULL,
  -- El script reenvía la misma notificación mientras siga en la bandeja del
  -- celular: la huella (hash de clave + hora + texto) evita duplicarla.
  huella           char(64)       NOT NULL UNIQUE,
  id_pago          int            UNIQUE REFERENCES pago_yape (id_pago) ON DELETE SET NULL,
  recibido_en      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX ix_yape_notificacion_sin_asignar ON yape_notificacion (monto, recibido_en) WHERE id_pago IS NULL;
