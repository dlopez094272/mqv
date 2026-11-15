-- ============================================================
-- Módulo Alabanza + Programa de actividades - MQV
-- Ejecutar en la base de datos mqv (se puede re-ejecutar)
-- ============================================================

-- 1. Biblioteca de canciones / himnos / coros
--    letra_acordes: formato ChordPro  ->  [G]Cuan grande es [D]Él
--    partitura_abc: notación ABC (melodía) que se dibuja y reproduce con abcjs
CREATE TABLE IF NOT EXISTS `alabanza_canciones` (
  `idcanciones`     INT           NOT NULL AUTO_INCREMENT,
  `titulo`          VARCHAR(255)  NOT NULL,
  `autor`           VARCHAR(255)  NULL,
  `tipo`            VARCHAR(30)   NOT NULL DEFAULT 'cancion' COMMENT 'cancion | himno | coro',
  `tonalidad`       VARCHAR(5)    NULL COMMENT 'Tonalidad original: C, G, Bb, F#m...',
  `bpm`             SMALLINT      NULL,
  `compas`          VARCHAR(5)    NULL DEFAULT '4/4',
  `categoria`       VARCHAR(60)   NULL COMMENT 'Adoración, Júbilo, Santa Cena...',
  `etiquetas`       VARCHAR(255)  NULL,
  `letra_acordes`   MEDIUMTEXT    NULL,
  `partitura_abc`   MEDIUMTEXT    NULL,
  `youtube_url`     VARCHAR(500)  NULL,
  `spotify_url`     VARCHAR(500)  NULL,
  `notas`           TEXT          NULL,
  `dominio_publico` TINYINT(1)    NOT NULL DEFAULT 0,
  `ccli`            VARCHAR(20)   NULL COMMENT 'Número de canción CCLI (si aplica)',
  `activo`          TINYINT(1)    NOT NULL DEFAULT 1,
  `usuario`         VARCHAR(150)  NULL,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcanciones`),
  KEY `idx_can_titulo` (`titulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Archivos de una canción: pistas de audio (completa o por instrumento) y partituras PDF/imagen
CREATE TABLE IF NOT EXISTS `alabanza_archivos` (
  `idarchivos`      INT           NOT NULL AUTO_INCREMENT,
  `idcanciones`     INT           NOT NULL,
  `tipo`            VARCHAR(20)   NOT NULL DEFAULT 'audio' COMMENT 'audio | partitura | otro',
  `pista`           VARCHAR(60)   NULL COMMENT 'Completa, Voz, Bajo, Batería, Teclado, Guitarra, Click...',
  `nombre_original` VARCHAR(255)  NOT NULL,
  `filename`        VARCHAR(255)  NOT NULL,
  `mimetype`        VARCHAR(120)  NULL,
  `size`            INT           NULL,
  `orden`           INT           NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idarchivos`),
  KEY `fk_alarch_can` (`idcanciones`),
  CONSTRAINT `fk_alarch_can` FOREIGN KEY (`idcanciones`)
    REFERENCES `alabanza_canciones` (`idcanciones`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Programa (orden del culto) de una actividad: momentos + canciones
CREATE TABLE IF NOT EXISTS `actividades_programa` (
  `idprograma`      INT           NOT NULL AUTO_INCREMENT,
  `idactividades`   INT           NOT NULL,
  `orden`           INT           NOT NULL DEFAULT 0,
  `tipo`            VARCHAR(20)   NOT NULL DEFAULT 'momento' COMMENT 'momento | cancion',
  `titulo`          VARCHAR(255)  NULL COMMENT 'Bienvenida, Oración, Predicación...',
  `idcanciones`     INT           NULL,
  `tonalidad`       VARCHAR(5)    NULL COMMENT 'Tonalidad en que se tocará ese día',
  `responsable`     VARCHAR(255)  NULL,
  `hora`            TIME          NULL,
  `duracion_min`    SMALLINT      NULL,
  `notas`           TEXT          NULL,
  PRIMARY KEY (`idprograma`),
  KEY `fk_actprog_act` (`idactividades`),
  KEY `fk_actprog_can` (`idcanciones`),
  CONSTRAINT `fk_actprog_act` FOREIGN KEY (`idactividades`)
    REFERENCES `actividades` (`idactividades`) ON DELETE CASCADE,
  CONSTRAINT `fk_actprog_can` FOREIGN KEY (`idcanciones`)
    REFERENCES `alabanza_canciones` (`idcanciones`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Músicos / equipo de alabanza asignado a una actividad
CREATE TABLE IF NOT EXISTS `actividades_musicos` (
  `idactividades_musicos` INT          NOT NULL AUTO_INCREMENT,
  `idactividades`         INT          NOT NULL,
  `idpersonas`            INT          NOT NULL,
  `instrumento`           VARCHAR(60)  NULL COMMENT 'Voz, Guitarra, Bajo, Batería, Teclado...',
  PRIMARY KEY (`idactividades_musicos`),
  UNIQUE KEY `uq_actmus` (`idactividades`, `idpersonas`, `instrumento`),
  KEY `fk_actmus_per` (`idpersonas`),
  CONSTRAINT `fk_actmus_act` FOREIGN KEY (`idactividades`)
    REFERENCES `actividades` (`idactividades`) ON DELETE CASCADE,
  CONSTRAINT `fk_actmus_per` FOREIGN KEY (`idpersonas`)
    REFERENCES `personas` (`idpersonas`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Permisos para Superadmin (GroupID = -1)
INSERT IGNORE INTO `mqv_ugrights` (`TableName`, `GroupID`, `AccessMask`) VALUES
  ('alabanza', -1, 'SAED');
