-- ============================================================
-- Módulo Publicaciones — Galería de múltiples fotos
-- Ejecutar en la base de datos mqv (después de publicaciones.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS `publicaciones_fotos` (
  `idfoto`          INT           NOT NULL AUTO_INCREMENT,
  `idpublicaciones` INT           NOT NULL,
  `filename`        VARCHAR(255)  NOT NULL,
  `original_name`   VARCHAR(255)  NULL,
  `orden`           INT           NOT NULL DEFAULT 0,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idfoto`),
  KEY `fk_pubfoto_pub` (`idpublicaciones`),
  CONSTRAINT `fk_pubfoto_pub` FOREIGN KEY (`idpublicaciones`)
    REFERENCES `publicaciones` (`idpublicaciones`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
