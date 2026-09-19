-- =====================================================================
--  KamayMenu / Karta Kamay — Esquema PostgreSQL
--  Requiere PostgreSQL 15+ (usa ON DELETE SET NULL (columna))
--
--  Convenciones:
--   * Nombres en snake_case, sin ñ ni tildes.
--   * Fechas con hora en timestamptz (siempre UTC en la BD; convierte en Go).
--   * Borrado: usuarios, restaurantes, productos y planes se DESACTIVAN
--     (activo = false), no se borran. Las FK hacia usuario, restaurante
--     (desde suscripcion/factura) y plan son RESTRICT a propósito, para
--     no perder historial de pagos.
--   * Contenido (productos, precios, agotado) en tablas.
--     Diseño del menú (bloques, colores, tipografía) en menu_version.contenido (jsonb).
-- =====================================================================


-- =====================================================================
-- 0. FUNCIONES GENÉRICAS
-- =====================================================================

CREATE OR REPLACE FUNCTION set_fecha_actualizacion()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.fecha_actualizacion := now();
  RETURN NEW;
END
$$;


-- =====================================================================
-- 1. USUARIOS Y NOTIFICACIONES
-- =====================================================================

CREATE TABLE usuario (
  id_usuario      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Normaliza en Go: strings.ToLower(strings.TrimSpace(correo))
  correo          varchar(150) NOT NULL,
  -- Hash bcrypt/argon2, NUNCA la contraseña en texto plano
  password_hash   varchar(255) NOT NULL,
  nombre          varchar(150) NOT NULL,
  activo          boolean      NOT NULL DEFAULT true,
  fecha_registro  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_correo UNIQUE (correo),
  CONSTRAINT ck_usuario_correo CHECK (correo = lower(correo) AND position('@' IN correo) > 1)
);

CREATE TABLE notificacion (
  id_notificacion  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario       int          NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  tipo             varchar(20)  NOT NULL DEFAULT 'info'
                   CHECK (tipo IN ('info', 'suscripcion', 'pago', 'sistema')),
  titulo           varchar(150) NOT NULL,
  descripcion      text,
  leida            boolean      NOT NULL DEFAULT false,
  fecha_creacion   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX ix_notificacion_usuario
  ON notificacion (id_usuario, leida, fecha_creacion DESC);


-- =====================================================================
-- 2. RESTAURANTES
-- =====================================================================

-- Tipo de restaurante (cevichería, nikkei...). Antes se mezclaba con
-- la categoría de platos; ahora son tablas distintas.
CREATE TABLE tipo_restaurante (
  id_tipo_restaurante  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre               varchar(80) NOT NULL UNIQUE
);

CREATE TABLE restaurante (
  id_restaurante       int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario           int          NOT NULL REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  id_tipo_restaurante  int          REFERENCES tipo_restaurante (id_tipo_restaurante) ON DELETE SET NULL,
  nombre               varchar(150) NOT NULL,
  -- Subdominio de la marca: <subdominio>.kartakamay.app
  subdominio           varchar(40)  NOT NULL,
  slogan               varchar(150),
  url_logo             varchar(255),
  telefono             char(9),
  -- Para calcular el badge "Abierto/Cerrado" con el horario de cada local
  zona_horaria         varchar(40)  NOT NULL DEFAULT 'America/Lima',
  activo               boolean      NOT NULL DEFAULT true,
  fecha_registro       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_restaurante_subdominio UNIQUE (subdominio),
  -- 3 a 40 caracteres, minúsculas/números/guiones, sin guion al inicio o final
  CONSTRAINT ck_restaurante_subdominio_formato
    CHECK (subdominio ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  CONSTRAINT ck_restaurante_subdominio_reservado
    CHECK (subdominio NOT IN ('www', 'app', 'api', 'admin', 'mail', 'static', 'assets',
                              'cdn', 'dashboard', 'panel', 'ftp', 'smtp', 'blog',
                              'ayuda', 'soporte', 'docs', 'status', 'login', 'registro')),
  CONSTRAINT ck_restaurante_telefono CHECK (telefono ~ '^[0-9]{9}$')
);

CREATE INDEX ix_restaurante_usuario ON restaurante (id_usuario);


-- =====================================================================
-- 3. PLANES, SUSCRIPCIONES Y FACTURAS
-- =====================================================================

CREATE TABLE plan (
  id_plan         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          varchar(80)   NOT NULL UNIQUE,
  precio          numeric(8, 2) NOT NULL CHECK (precio >= 0),
  max_menu        int           NOT NULL CHECK (max_menu > 0),
  max_local       int           NOT NULL CHECK (max_local > 0),
  activo          boolean       NOT NULL DEFAULT true,
  fecha_creacion  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE suscripcion (
  id_suscripcion  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante  int         NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE RESTRICT,
  id_plan         int         NOT NULL REFERENCES plan (id_plan) ON DELETE RESTRICT,
  metodo_pago     varchar(20) NOT NULL
                  CHECK (metodo_pago IN ('tarjeta', 'yape', 'plin', 'transferencia', 'otro')),
  estado          varchar(15) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'activa', 'cancelada', 'vencida')),
  fecha_inicio    timestamptz NOT NULL,
  fecha_fin       timestamptz NOT NULL,
  renueva_en      date,
  cancelado_en    timestamptz,
  fecha_registro  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_suscripcion_fechas CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX ix_suscripcion_restaurante ON suscripcion (id_restaurante);
-- Como máximo UNA suscripción activa por restaurante
CREATE UNIQUE INDEX ux_suscripcion_activa ON suscripcion (id_restaurante) WHERE estado = 'activa';

-- 1:N — se emite una factura por cada periodo/renovación
CREATE TABLE factura (
  id_factura      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_suscripcion  int           NOT NULL REFERENCES suscripcion (id_suscripcion) ON DELETE RESTRICT,
  monto           numeric(10, 2) NOT NULL CHECK (monto >= 0),
  estado          varchar(15)   NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
  periodo_inicio  date          NOT NULL,
  periodo_fin     date          NOT NULL,
  fecha_emision   timestamptz   NOT NULL DEFAULT now(),
  fecha_pago      timestamptz,
  CONSTRAINT ck_factura_periodo CHECK (periodo_fin >= periodo_inicio)
);

CREATE INDEX ix_factura_suscripcion ON factura (id_suscripcion, fecha_emision DESC);

-- Plan vigente por restaurante: úsala en Go para validar max_menu / max_local
CREATE VIEW v_plan_restaurante AS
SELECT s.id_restaurante,
       s.id_suscripcion,
       p.id_plan,
       p.nombre AS plan,
       p.max_menu,
       p.max_local,
       s.fecha_fin,
       s.renueva_en
FROM suscripcion s
JOIN plan p ON p.id_plan = s.id_plan
WHERE s.estado = 'activa';


-- =====================================================================
-- 4. CATÁLOGO: CATEGORÍAS, PRODUCTOS Y ETIQUETAS (contenido)
-- =====================================================================

-- Categoría de PLATOS ("Entradas", "Fondos"...), propia de cada restaurante
CREATE TABLE categoria (
  id_categoria    int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante  int          NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  nombre          varchar(100) NOT NULL,
  orden           int          NOT NULL DEFAULT 0,
  activo          boolean      NOT NULL DEFAULT true,
  -- Necesario para la FK compuesta de producto (garantiza mismo restaurante)
  CONSTRAINT uq_categoria_restaurante UNIQUE (id_categoria, id_restaurante)
);

CREATE UNIQUE INDEX ux_categoria_nombre ON categoria (id_restaurante, lower(nombre));

CREATE TABLE producto (
  id_producto          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante       int            NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  id_categoria         int,
  nombre               varchar(150)   NOT NULL,
  descripcion          text,
  precio               numeric(10, 2) NOT NULL CHECK (precio >= 0),
  url_imagen           varchar(255),
  -- activo = visible en el catálogo; agotado = visible pero marcado "Agotado"
  activo               boolean        NOT NULL DEFAULT true,
  agotado              boolean        NOT NULL DEFAULT false,
  fecha_registro       timestamptz    NOT NULL DEFAULT now(),
  fecha_actualizacion  timestamptz    NOT NULL DEFAULT now(),
  -- La categoría debe ser del MISMO restaurante que el producto.
  -- Si se borra la categoría, el producto queda sin categoría.
  CONSTRAINT fk_producto_categoria
    FOREIGN KEY (id_categoria, id_restaurante)
    REFERENCES categoria (id_categoria, id_restaurante)
    ON DELETE SET NULL (id_categoria)
);

-- NO borres productos con DELETE: los bloques del menú (JSON) los referencian
-- por id. Desactívalos con activo = false; el renderizador ignora los inactivos.
CREATE INDEX ix_producto_restaurante ON producto (id_restaurante, id_categoria);

CREATE TRIGGER trg_producto_fecha
  BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

-- Etiquetas globales para el filtro de alérgenos / dietas
CREATE TABLE etiqueta (
  id_etiqueta  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo       varchar(30) NOT NULL UNIQUE,   -- estable, para usar en Go/JSON
  nombre       varchar(50) NOT NULL,
  tipo         varchar(10) NOT NULL CHECK (tipo IN ('alergeno', 'dieta'))
);

CREATE TABLE producto_etiqueta (
  id_producto  int NOT NULL REFERENCES producto (id_producto) ON DELETE CASCADE,
  id_etiqueta  int NOT NULL REFERENCES etiqueta (id_etiqueta) ON DELETE CASCADE,
  PRIMARY KEY (id_producto, id_etiqueta)
);

CREATE INDEX ix_producto_etiqueta_etiqueta ON producto_etiqueta (id_etiqueta);


-- =====================================================================
-- 5. MENÚS Y VERSIONES (diseño tipo Canva)
-- =====================================================================

CREATE TABLE menu (
  id_menu              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante       int          NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  nombre               varchar(100) NOT NULL,
  es_principal         boolean      NOT NULL DEFAULT false,
  activo               boolean      NOT NULL DEFAULT true,
  fecha_creacion       timestamptz  NOT NULL DEFAULT now(),
  fecha_actualizacion  timestamptz  NOT NULL DEFAULT now(),
  -- Necesario para la FK compuesta de local
  CONSTRAINT uq_menu_restaurante UNIQUE (id_menu, id_restaurante)
);

CREATE INDEX ix_menu_restaurante ON menu (id_restaurante);
CREATE UNIQUE INDEX ux_menu_nombre ON menu (id_restaurante, lower(nombre));
-- Un solo menú principal por restaurante.
-- OJO al cambiar de principal: hazlo en una transacción con DOS sentencias
-- (primero false al anterior, luego true al nuevo). Un solo UPDATE que voltee
-- ambos puede fallar por el índice único.
CREATE UNIQUE INDEX ux_menu_principal ON menu (id_restaurante) WHERE es_principal;

CREATE TRIGGER trg_menu_fecha
  BEFORE UPDATE ON menu
  FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

CREATE TABLE menu_version (
  id_version           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_menu              int         NOT NULL REFERENCES menu (id_menu) ON DELETE CASCADE,
  numero               int         NOT NULL,
  estado               varchar(10) NOT NULL
                       CHECK (estado IN ('borrador', 'publicada', 'archivada')),
  -- Diseño completo del menú: tema + árbol de bloques.
  -- Los bloques guardan REFERENCIAS (id_producto, id_categoria), nunca copias.
  contenido            jsonb       NOT NULL DEFAULT '{
    "schema_version": 1,
    "tema": {
      "tipografia": "inter",
      "color_acento": "#F97316",
      "fondo": "claro",
      "radio_borde": 8,
      "mostrar_precios": true,
      "mostrar_fotos": true,
      "filtro_alergenos": false
    },
    "bloques": []
  }'::jsonb,
  fecha_creacion       timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion  timestamptz NOT NULL DEFAULT now(),
  fecha_publicacion    timestamptz,
  CONSTRAINT uq_menu_version_numero UNIQUE (id_menu, numero),
  CONSTRAINT ck_menu_version_json
    CHECK (jsonb_typeof(contenido) = 'object'
           AND jsonb_typeof(contenido -> 'bloques') = 'array'),
  -- Solo el borrador carece de fecha de publicación
  CONSTRAINT ck_menu_version_publicacion
    CHECK ((estado = 'borrador') = (fecha_publicacion IS NULL))
);

-- Máximo un borrador y una publicada por menú
CREATE UNIQUE INDEX ux_menu_version_borrador  ON menu_version (id_menu) WHERE estado = 'borrador';
CREATE UNIQUE INDEX ux_menu_version_publicada ON menu_version (id_menu) WHERE estado = 'publicada';

CREATE TRIGGER trg_menu_version_fecha
  BEFORE UPDATE ON menu_version
  FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

-- Al crear un menú se crea automáticamente su primer borrador (versión 1)
CREATE OR REPLACE FUNCTION trg_menu_borrador_inicial()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO menu_version (id_menu, numero, estado)
  VALUES (NEW.id_menu, 1, 'borrador');
  RETURN NEW;
END
$$;

CREATE TRIGGER menu_borrador_inicial
  AFTER INSERT ON menu
  FOR EACH ROW EXECUTE FUNCTION trg_menu_borrador_inicial();

-- Publicar: archiva la publicada actual, promueve el borrador y crea un
-- borrador nuevo copiado de lo que se acaba de publicar.
-- Devuelve el id_version que quedó publicado.
-- Uso desde Go:  SELECT publicar_menu($1)
CREATE OR REPLACE FUNCTION publicar_menu(p_id_menu int)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  v_borrador  menu_version%ROWTYPE;
  v_numero    int;
BEGIN
  -- Bloquea el menú para serializar publicaciones concurrentes
  PERFORM 1 FROM menu WHERE id_menu = p_id_menu FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El menú % no existe', p_id_menu USING ERRCODE = 'no_data_found';
  END IF;

  SELECT * INTO v_borrador
  FROM menu_version
  WHERE id_menu = p_id_menu AND estado = 'borrador';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El menú % no tiene borrador', p_id_menu USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE menu_version
     SET estado = 'archivada'
   WHERE id_menu = p_id_menu AND estado = 'publicada';

  UPDATE menu_version
     SET estado = 'publicada', fecha_publicacion = now()
   WHERE id_version = v_borrador.id_version;

  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero
  FROM menu_version WHERE id_menu = p_id_menu;

  INSERT INTO menu_version (id_menu, numero, estado, contenido)
  VALUES (p_id_menu, v_numero, 'borrador', v_borrador.contenido);

  UPDATE menu SET fecha_actualizacion = now() WHERE id_menu = p_id_menu;

  RETURN v_borrador.id_version;
END
$$;


-- =====================================================================
-- 6. LOCALES (SUCURSALES)
-- =====================================================================

-- El subdominio es de la marca (restaurante); cada local se accede por ruta:
--   bistro-andino.kartakamay.app/miraflores
CREATE TABLE local (
  id_local        int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante  int          NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  -- Menú asignado a este local. NULL = usa el menú principal del restaurante
  id_menu         int,
  nombre          varchar(100) NOT NULL,
  slug            varchar(40)  NOT NULL,
  direccion       varchar(150),
  telefono        char(9),
  -- Formato libre que defines tú, ej: {"lun":[["12:00","22:00"]], "mar":[...]}
  horario         jsonb,
  activo          boolean      NOT NULL DEFAULT true,
  fecha_registro  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_local_slug UNIQUE (id_restaurante, slug),
  -- Necesario para FK compuestas (visita_menu)
  CONSTRAINT uq_local_restaurante UNIQUE (id_local, id_restaurante),
  CONSTRAINT ck_local_slug
    CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'
           AND slug NOT IN ('api', 'static', 'assets', 'admin', 'health', 'robots', 'sitemap')),
  CONSTRAINT ck_local_telefono CHECK (telefono ~ '^[0-9]{9}$'),
  -- El menú asignado debe ser del mismo restaurante; si se borra, vuelve al principal
  CONSTRAINT fk_local_menu
    FOREIGN KEY (id_menu, id_restaurante)
    REFERENCES menu (id_menu, id_restaurante)
    ON DELETE SET NULL (id_menu)
);


-- =====================================================================
-- 7. ESTADÍSTICAS (dashboard: visitas y escaneos de QR)
-- =====================================================================

CREATE TABLE visita_menu (
  id_visita       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_restaurante  int         NOT NULL REFERENCES restaurante (id_restaurante) ON DELETE CASCADE,
  id_local        int,
  origen          varchar(10) NOT NULL CHECK (origen IN ('qr', 'link')),
  fecha           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_visita_local
    FOREIGN KEY (id_local, id_restaurante)
    REFERENCES local (id_local, id_restaurante)
    ON DELETE SET NULL (id_local)
);

CREATE INDEX ix_visita_restaurante_fecha ON visita_menu (id_restaurante, fecha DESC);
-- Si el tráfico crece mucho: agrega una tabla de conteos diarios y
-- borra/archiva visitas antiguas.


-- =====================================================================
-- 8. CONSULTAS DE REFERENCIA PARA GO (comentadas)
-- =====================================================================

-- 1) Resolver el subdominio (host "bistro-andino.kartakamay.app" → "bistro-andino")
--    SELECT id_restaurante, nombre, slogan, url_logo, zona_horaria
--    FROM restaurante
--    WHERE subdominio = $1 AND activo;

-- 2a) Home del subdominio → menú principal publicado
--    SELECT mv.id_version, mv.contenido
--    FROM menu m
--    JOIN menu_version mv ON mv.id_menu = m.id_menu AND mv.estado = 'publicada'
--    WHERE m.id_restaurante = $1 AND m.es_principal AND m.activo;

-- 2b) /{slug} → menú del local, o el principal si no tiene uno asignado
--    SELECT l.id_local, mv.contenido
--    FROM local l
--    JOIN menu m ON m.id_restaurante = l.id_restaurante AND m.activo
--               AND (m.id_menu = l.id_menu OR (l.id_menu IS NULL AND m.es_principal))
--    JOIN menu_version mv ON mv.id_menu = m.id_menu AND mv.estado = 'publicada'
--    WHERE l.id_restaurante = $1 AND l.slug = $2 AND l.activo;

-- 3) Productos del menú, en UNA consulta ($2 = ids recolectados del JSON, []int32).
--    Filtrar por id_restaurante evita mostrar productos ajenos si alguien
--    manipula el JSON.
--    SELECT p.id_producto, p.nombre, p.descripcion, p.precio, p.url_imagen, p.agotado,
--           COALESCE(array_agg(e.codigo) FILTER (WHERE e.codigo IS NOT NULL), '{}') AS etiquetas
--    FROM producto p
--    LEFT JOIN producto_etiqueta pe ON pe.id_producto = p.id_producto
--    LEFT JOIN etiqueta e ON e.id_etiqueta = pe.id_etiqueta
--    WHERE p.id_restaurante = $1 AND p.activo AND p.id_producto = ANY($2::int[])
--    GROUP BY p.id_producto;

-- 4) Autoguardado del editor
--    UPDATE menu_version SET contenido = $2
--    WHERE id_menu = $1 AND estado = 'borrador';

-- 5) Publicar
--    SELECT publicar_menu($1);

-- 6) Restaurar una versión anterior como borrador ($2 = id_version archivada)
--    UPDATE menu_version d SET contenido = v.contenido
--    FROM menu_version v
--    WHERE d.id_menu = $1 AND d.estado = 'borrador'
--      AND v.id_version = $2 AND v.id_menu = d.id_menu;

-- 7) Tarjetas del dashboard
--    SELECT count(*) AS visitas_mes,
--           count(*) FILTER (WHERE origen = 'qr') AS escaneos_qr_30d
--    FROM visita_menu
--    WHERE id_restaurante = $1 AND fecha >= now() - interval '30 days';
--
--    SELECT count(*) FROM producto
--    WHERE id_restaurante = $1 AND activo AND agotado;
