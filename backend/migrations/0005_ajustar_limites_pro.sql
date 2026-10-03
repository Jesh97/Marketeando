-- Redefine los límites de "Pro": antes daba prácticamente ilimitado (9999
-- menús / 5 locales); ahora el modelo de negocio es Básico=1/1, Pro=2/2,
-- Enterprise=ilimitado (9999/9999, sin cambios). Las plantillas ("bocetos")
-- del editor visual pasan a requerir Pro o superior (ver frontend, no hay
-- columna para esto porque las plantillas viven como datos estáticos en el
-- cliente, no en la base de datos).
UPDATE plan SET max_menu = 2, max_local = 2 WHERE nombre = 'Pro';
