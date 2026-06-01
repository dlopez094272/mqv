-- ============================================================
-- Migraciones necesarias para los nuevos módulos - MQV
-- Ejecutar en la base de datos mqv
-- ============================================================

-- 1. Catálogo de estados de crecimiento
CREATE TABLE IF NOT EXISTS `estados_crecimiento` (
  `idestados_crecimiento` INT NOT NULL AUTO_INCREMENT,
  `estado_crecimiento`    VARCHAR(145) NOT NULL,
  `activo`                TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idestados_crecimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Datos iniciales sugeridos
INSERT IGNORE INTO `estados_crecimiento` (`estado_crecimiento`, `activo`) VALUES
  ('Primer Contacto', 1),
  ('En Seguimiento', 1),
  ('Asistente Regular', 1),
  ('Conversión', 1),
  ('Bautizado', 1),
  ('Discipulado', 1),
  ('Servidor', 1),
  ('Líder', 1);

-- 2. Historial de crecimiento por persona
CREATE TABLE IF NOT EXISTS `personas_crecimiento` (
  `idpersonas_crecimiento`  INT NOT NULL AUTO_INCREMENT,
  `idpersonas`              INT NOT NULL,
  `idestados_crecimiento`   INT NOT NULL,
  `fecha`                   DATE NOT NULL,
  `comentario`              VARCHAR(245) NULL,
  PRIMARY KEY (`idpersonas_crecimiento`),
  KEY `fk_pc_personas` (`idpersonas`),
  KEY `fk_pc_estado`   (`idestados_crecimiento`),
  CONSTRAINT `fk_pc_personas` FOREIGN KEY (`idpersonas`) REFERENCES `personas` (`idpersonas`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_estado`   FOREIGN KEY (`idestados_crecimiento`) REFERENCES `estados_crecimiento` (`idestados_crecimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Encargados por grupo (si no existe ya)
CREATE TABLE IF NOT EXISTS `grupos_encargados` (
  `idgrupos_encargados` INT NOT NULL AUTO_INCREMENT,
  `idgrupos`            INT NOT NULL,
  `idpersonas`          INT NOT NULL,
  PRIMARY KEY (`idgrupos_encargados`),
  UNIQUE KEY `uk_ge` (`idgrupos`, `idpersonas`),
  KEY `fk_ge_grupos`   (`idgrupos`),
  KEY `fk_ge_personas` (`idpersonas`),
  CONSTRAINT `fk_ge_grupos`   FOREIGN KEY (`idgrupos`)   REFERENCES `grupos`   (`idgrupos`) ON DELETE CASCADE,
  CONSTRAINT `fk_ge_personas` FOREIGN KEY (`idpersonas`) REFERENCES `personas` (`idpersonas`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Campo idpersonas en tabla usuarios (vincula usuario del sistema con ficha de persona)
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `idpersonas` INT NULL DEFAULT NULL AFTER `telefono`,
  ADD KEY IF NOT EXISTS `fk_u_personas` (`idpersonas`);

-- Nota: Si tu versión de MySQL no soporta ADD COLUMN IF NOT EXISTS, usa:
-- ALTER TABLE `usuarios` ADD COLUMN `idpersonas` INT NULL DEFAULT NULL AFTER `telefono`;
