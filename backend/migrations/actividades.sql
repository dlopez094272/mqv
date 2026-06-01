-- ============================================================
-- Módulo Actividades - MQV
-- Ejecutar en la base de datos mqv
-- ============================================================

-- 1. Agregar campo color a categorías de actividades
ALTER TABLE `actividades_categorias`
  ADD COLUMN IF NOT EXISTS `color` VARCHAR(7) NOT NULL DEFAULT '#3788d8' AFTER `categoria`;

-- 2. Tabla principal de actividades
CREATE TABLE IF NOT EXISTS `actividades` (
  `idactividades`  INT           NOT NULL AUTO_INCREMENT,
  `idcategorias`   INT           NULL,
  `nombre`         VARCHAR(255)  NOT NULL,
  `descripcion`    TEXT          NULL,
  `fecha_inicio`   DATE          NOT NULL,
  `fecha_fin`      DATE          NOT NULL,
  `hora_inicio`    TIME          NULL,
  `hora_fin`       TIME          NULL,
  `adjuntos`       JSON          NULL,
  `logo`           VARCHAR(255)  NULL,
  `idlugares`      INT           NULL,
  `usuario`        VARCHAR(100)  NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idactividades`),
  KEY `fk_act_cat` (`idcategorias`),
  KEY `fk_act_lug` (`idlugares`),
  CONSTRAINT `fk_act_cat` FOREIGN KEY (`idcategorias`)
    REFERENCES `actividades_categorias` (`idactividades_categorias`) ON DELETE SET NULL,
  CONSTRAINT `fk_act_lug` FOREIGN KEY (`idlugares`)
    REFERENCES `lugares` (`idlugares`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Permiso para grupo Superadmin (GroupID = -1)
INSERT IGNORE INTO `mqv_ugrights` (`TableName`, `GroupID`, `AccessMask`) VALUES
  ('actividades', -1, 'SAED');
