-- ============================================================
-- Actividades: series por día + formularios de inscripción
-- Ejecutar en la base de datos mqv
-- ============================================================

-- 1. Actividades de varios días creadas "una por cada día".
--    Todas las actividades generadas comparten el mismo identificador de serie
--    para poder reconocerlas como parte del mismo evento.
--    (Condicional para que funcione igual en MySQL y MariaDB y pueda re-ejecutarse.)
SET @existe_serie := (SELECT COUNT(*) FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'serie');
SET @sql_serie := IF(@existe_serie = 0,
  'ALTER TABLE `actividades` ADD COLUMN `serie` CHAR(36) NULL AFTER `idlugares`, ADD INDEX `idx_act_serie` (`serie`)',
  'SELECT 1');
PREPARE stmt_serie FROM @sql_serie;
EXECUTE stmt_serie;
DEALLOCATE PREPARE stmt_serie;

-- 2. Formularios de inscripción (1 o más por actividad).
--    `preguntas` es un arreglo JSON; cada pregunta tiene una `clave` estable que
--    usan las respuestas, de modo que editar el formulario no rompe las ya recibidas.
CREATE TABLE IF NOT EXISTS `actividades_formularios` (
  `idactividades_formularios` INT          NOT NULL AUTO_INCREMENT,
  `idactividades`             INT          NOT NULL,
  `titulo`                    VARCHAR(255) NOT NULL,
  `descripcion`               TEXT         NULL,
  `token`                     VARCHAR(40)  NOT NULL COMMENT 'Identificador público de la URL',
  `publico`                   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = cualquiera con la URL, 0 = solo usuarios del sistema',
  `activo`                    TINYINT(1)   NOT NULL DEFAULT 1,
  `fecha_limite`              DATETIME     NULL,
  `mensaje_confirmacion`      TEXT         NULL,
  `preguntas`                 JSON         NOT NULL,
  `usuario`                   VARCHAR(100) NULL,
  `created_at`                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                TIMESTAMP    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idactividades_formularios`),
  UNIQUE KEY `uq_actform_token` (`token`),
  KEY `fk_actform_act` (`idactividades`),
  CONSTRAINT `fk_actform_act` FOREIGN KEY (`idactividades`)
    REFERENCES `actividades` (`idactividades`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Respuestas recibidas. `respuestas` es un objeto JSON { clave_pregunta: valor }.
CREATE TABLE IF NOT EXISTS `actividades_formularios_respuestas` (
  `idactividades_formularios_respuestas` INT          NOT NULL AUTO_INCREMENT,
  `idactividades_formularios`            INT          NOT NULL,
  `respuestas`                           JSON         NOT NULL,
  `usuario`                              VARCHAR(100) NULL COMMENT 'Usuario del sistema que respondió (si inició sesión)',
  `ip`                                   VARCHAR(64)  NULL,
  `created_at`                           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idactividades_formularios_respuestas`),
  KEY `fk_actformresp_form` (`idactividades_formularios`),
  CONSTRAINT `fk_actformresp_form` FOREIGN KEY (`idactividades_formularios`)
    REFERENCES `actividades_formularios` (`idactividades_formularios`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Notificaciones por correo (opcional) de cada formulario:
--    { "inscrito": bool, "pregunta_email": "clave", "correos": ["organizador@..."] }
SET @existe_notif := (SELECT COUNT(*) FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades_formularios'
                        AND COLUMN_NAME = 'notificaciones');
SET @sql_notif := IF(@existe_notif = 0,
  'ALTER TABLE `actividades_formularios` ADD COLUMN `notificaciones` JSON NULL AFTER `mensaje_confirmacion`',
  'SELECT 1');
PREPARE stmt_notif FROM @sql_notif;
EXECUTE stmt_notif;
DEALLOCATE PREPARE stmt_notif;
