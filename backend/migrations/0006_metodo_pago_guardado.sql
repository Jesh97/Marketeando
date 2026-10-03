-- Método de pago guardado por restaurante, independiente de cada suscripción
-- (antes "metodo_pago" vivía solo como string en cada fila de suscripcion,
-- sin datos para mostrar una tarjeta real en el frontend). Es una
-- simulación: NUNCA se guarda el número completo de tarjeta, solo la marca
-- y los últimos 4 dígitos que derivamos en el backend antes de guardar.
CREATE TABLE metodo_pago_guardado (
  id_restaurante  int         PRIMARY KEY REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  tipo            varchar(20) NOT NULL
                  CHECK (tipo IN ('tarjeta', 'yape')),
  titular         varchar(150),
  marca           varchar(20),
  ultimos4        char(4),
  vencimiento     varchar(5),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
