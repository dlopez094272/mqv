-- ============================================================
-- Módulo Publicaciones/Noticias - MQV
-- Ejecutar en la base de datos mqv
-- ============================================================

-- 1. Tabla principal de publicaciones
CREATE TABLE IF NOT EXISTS `publicaciones` (
  `idpublicaciones`     INT           NOT NULL AUTO_INCREMENT,
  `titulo`              VARCHAR(255)  NOT NULL,
  `slug`                VARCHAR(280)  NOT NULL,
  `resumen`             VARCHAR(500)  NULL,
  `contenido_html`      LONGTEXT      NULL,
  `tipo_media`          ENUM('imagen','video','ninguno') NOT NULL DEFAULT 'ninguno',
  `media_filename`      VARCHAR(255)  NULL,
  `media_original_name` VARCHAR(255)  NULL,
  `estado`              ENUM('borrador','publicado') NOT NULL DEFAULT 'borrador',
  `created_by`          VARCHAR(150)  CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL,
  `created_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `publicado_at`        DATETIME      NULL,
  PRIMARY KEY (`idpublicaciones`),
  UNIQUE KEY `uq_publicaciones_slug` (`slug`),
  FOREIGN KEY (`created_by`) REFERENCES `usuarios` (`usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Permiso para grupo Superadmin (GroupID = -1)
INSERT IGNORE INTO `mqv_ugrights` (`TableName`, `GroupID`, `AccessMask`) VALUES
  ('publicaciones', -1, 'SAED');
