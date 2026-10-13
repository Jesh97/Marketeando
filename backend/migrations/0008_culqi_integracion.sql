-- Reemplaza la simulación de pagos por cargos reales vía Culqi. La tarjeta ya
-- no se deriva de un número crudo (nunca llega al backend, se tokeniza en el
-- navegador con Culqi.js): queda guardada como cliente+tarjeta de Culqi, y
-- cada factura registra el id del cargo real que la pagó.
ALTER TABLE metodo_pago_guardado
  ADD COLUMN culqi_customer_id varchar(40),
  ADD COLUMN culqi_card_id     varchar(40);

ALTER TABLE factura
  ADD COLUMN culqi_charge_id varchar(40),
  ADD COLUMN moneda         varchar(3) NOT NULL DEFAULT 'PEN';

-- Precios migrados de USD a PEN porque Yape solo opera en soles (placeholder,
-- ajustar cuando el negocio defina el valor final, igual que el seed original).
UPDATE plan SET precio = 75.00  WHERE nombre = 'Pro';
UPDATE plan SET precio = 190.00 WHERE nombre = 'Enterprise';
