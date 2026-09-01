-- ============================================================
-- Vínculo entre Actividades y Tesorería
-- Ejecutar después de que existan `actividades` y `tesoreria_movimientos`
-- ============================================================

CREATE TABLE IF NOT EXISTS `actividades_tesoreria_movimientos` (
  `idactividades_tesoreria_movimientos` INT       NOT NULL AUTO_INCREMENT,
  `idactividades`           INT       NOT NULL,
  `idtesoreria_movimientos` INT       NOT NULL,
  `created_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idactividades_tesoreria_movimientos`),
  UNIQUE KEY `uq_atm_movimiento` (`idtesoreria_movimientos`),
  KEY `fk_atm_act` (`idactividades`),
  CONSTRAINT `fk_atm_act` FOREIGN KEY (`idactividades`)
    REFERENCES `actividades` (`idactividades`) ON DELETE CASCADE,
  CONSTRAINT `fk_atm_mov` FOREIGN KEY (`idtesoreria_movimientos`)
    REFERENCES `tesoreria_movimientos` (`idtesoreria_movimientos`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
