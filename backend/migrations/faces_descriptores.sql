-- Tabla para almacenar descriptores faciales de personas (vectores Float32Array de 128 dimensiones)
-- Generados por face-api.js a partir de las fotos de perfil
CREATE TABLE IF NOT EXISTS `personas_descriptores_faciales` (
  `idpersonas`     INT          NOT NULL,
  `descriptor`     TEXT         NOT NULL COMMENT 'JSON array con 128 valores float32',
  `foto_ref`       VARCHAR(255) NULL     COMMENT 'Filename de la foto usada para generar el descriptor',
  `actualizado_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idpersonas`),
  CONSTRAINT `fk_descriptor_persona`
    FOREIGN KEY (`idpersonas`) REFERENCES `personas`(`idpersonas`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
