-- Precios definitivos de los planes, en soles. La migración 0008 los había
-- "convertido" de dólares (S/ 75 y S/ 190), pero los valores originales ya
-- eran soles: Pro S/ 20 y Enterprise S/ 40 al mes.
UPDATE plan SET precio = 20.00 WHERE nombre = 'Pro';
UPDATE plan SET precio = 40.00 WHERE nombre = 'Enterprise';
