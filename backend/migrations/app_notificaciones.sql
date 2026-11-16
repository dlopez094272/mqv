-- ============================================================
-- App móvil: sesiones por dispositivo (no se cierran solas),
-- tokens de notificaciones push y bandeja de notificaciones.
-- Se puede re-ejecutar.
-- ============================================================

SET NAMES utf8mb4;

-- Un registro por teléfono con sesión iniciada. La sesión dura hasta que el
-- usuario la cierra (o el administrador lo desactiva): la app renueva su
-- token JWT con `refresh_hash` cada vez que lo necesita.
CREATE TABLE IF NOT EXISTS `usuarios_dispositivos` (
  `iddispositivo`  INT           NOT NULL AUTO_INCREMENT,
  `usuario`        VARCHAR(100)  NOT NULL,
  `refresh_hash`   CHAR(64)      NOT NULL COMMENT 'SHA-256 del token de renovación',
  `push_token`     VARCHAR(512)  NULL     COMMENT 'Token FCM del teléfono',
  `plataforma`     VARCHAR(20)   NULL,
  `modelo`         VARCHAR(120)  NULL,
  `app_version`    VARCHAR(20)   NULL,
  `creado`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_uso`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`iddispositivo`),
  UNIQUE KEY `uq_disp_refresh` (`refresh_hash`),
  KEY `ix_disp_usuario` (`usuario`),
  KEY `ix_disp_push` (`push_token`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bandeja de notificaciones de cada usuario (se ven en la app aunque el push no llegue).
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `idnotificaciones` INT           NOT NULL AUTO_INCREMENT,
  `usuario`          VARCHAR(100)  NOT NULL,
  `tipo`             VARCHAR(30)   NOT NULL COMMENT 'curso, servicio, tesoreria, general',
  `titulo`           VARCHAR(200)  NOT NULL,
  `cuerpo`           VARCHAR(500)  NULL,
  `datos`            JSON          NULL     COMMENT 'Pantalla a abrir en la app, p. ej. {"pantalla":"curso","id":5}',
  `leida`            TINYINT(1)    NOT NULL DEFAULT 0,
  `fecha`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idnotificaciones`),
  KEY `ix_notif_usuario` (`usuario`, `leida`, `fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
