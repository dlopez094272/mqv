-- ============================================================
-- Tablas nuevas para el módulo de Tesorería
-- Ejecutar después de que la tabla `tesoreria` ya exista
-- ============================================================

-- Catálogo de tipos de movimiento
CREATE TABLE IF NOT EXISTS `tesoreria_tipomov` (
  `idtipo_movimiento` INT          NOT NULL AUTO_INCREMENT,
  `tipo_movimiento`   VARCHAR(100) NOT NULL,
  `activo`            TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`idtipo_movimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `tesoreria_tipomov` (`idtipo_movimiento`, `tipo_movimiento`) VALUES
  (1, 'Ofrenda'),
  (2, 'Diezmo'),
  (3, 'Donación'),
  (4, 'Pago de servicios'),
  (5, 'Salarios'),
  (6, 'Compra de materiales'),
  (7, 'Ingreso especial'),
  (8, 'Egreso especial');

-- Usuarios con acceso a una tesorería específica
CREATE TABLE IF NOT EXISTS `tesoreria_usuarios` (
  `usuario`          VARCHAR(50) NOT NULL,
  `idtesoreria`      INT         NOT NULL,
  `solo_lectura`     TINYINT(1)  NOT NULL DEFAULT 0,
  `fecha_asignacion` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario`, `idtesoreria`),
  CONSTRAINT `fk_tu_tesoreria`
    FOREIGN KEY (`idtesoreria`) REFERENCES `tesoreria` (`idtesoreria`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movimientos de tesorería
CREATE TABLE IF NOT EXISTS `tesoreria_movimientos` (
  `idtesoreria_movimientos` INT           NOT NULL AUTO_INCREMENT,
  `fecha`                   DATE          NOT NULL,
  `concepto`                VARCHAR(145)  NOT NULL,
  `credito`                 DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `debito`                  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `dtesoreria`              INT           NOT NULL,
  `idtipo_movimiento`       INT                    DEFAULT NULL,
  `creador`                 VARCHAR(50)            DEFAULT NULL,
  `anulado`                 TINYINT(1)    NOT NULL DEFAULT 0,
  `fecha_anulacion`         DATETIME               DEFAULT NULL,
  `usuario_anulacion`       VARCHAR(50)            DEFAULT NULL,
  `fecha_creacion`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `adjuntos`                JSON                   DEFAULT NULL,
  PRIMARY KEY (`idtesoreria_movimientos`),
  CONSTRAINT `fk_tm_tesoreria`
    FOREIGN KEY (`dtesoreria`)        REFERENCES `tesoreria`        (`idtesoreria`)        ON DELETE RESTRICT,
  CONSTRAINT `fk_tm_tipo`
    FOREIGN KEY (`idtipo_movimiento`) REFERENCES `tesoreria_tipomov` (`idtipo_movimiento`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
