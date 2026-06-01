-- Módulo Personas - Iglesia Más que Vencedores
-- Ejecutar en base de datos: mqv

CREATE TABLE IF NOT EXISTS personas (
  idpersonas            INT AUTO_INCREMENT PRIMARY KEY,

  -- Personales
  primer_nombre         VARCHAR(50)  NOT NULL,
  segundo_nombre        VARCHAR(50),
  primer_apellido       VARCHAR(50)  NOT NULL,
  segundo_apellido      VARCHAR(50),
  apellidocasada        VARCHAR(50),
  fecha_nacimiento      DATE         NOT NULL,
  lugar_nacimiento      VARCHAR(100),
  idnacionalidades      INT,
  sexo                  CHAR(1)      NOT NULL COMMENT 'M o F',
  estado_civil          VARCHAR(20)  NOT NULL COMMENT 'Soltero, Casado, Viudo, Unido, Divorciado',
  tipo_documento        VARCHAR(20)  COMMENT 'DPI o PASAPORTE',
  no_documento          VARCHAR(30),
  foto                  LONGBLOB,

  -- Contacto
  telefono              VARCHAR(20),
  celular               VARCHAR(20),
  email                 VARCHAR(100),
  perfil_social         TEXT,

  -- Eclesiástico
  fecha_inicio_asistencia DATE,
  fecha_conversion      DATE,
  fecha_bautizo         DATE,
  idiglesias_bautizo    INT,
  idiglesias_anterior   INT,
  estado_asistencia_anterior VARCHAR(50),
  tiempo_iglesia_anterior    VARCHAR(100),
  nombre_pastor_anterior     VARCHAR(100),
  experiencia_ministerial    JSON COMMENT 'Array de idexperiencia_ministerial',
  areas_servir          JSON COMMENT 'Array de idexperiencia_ministerial (areas a servir)',
  maestro_escuela_dominical  VARCHAR(100),
  motivo_servir         TEXT,

  -- Direcciones
  iddept_nacimiento     INT,
  idmuni_nacimiento     INT,
  iddept_domicilio      INT,
  idmuni_domicilio      INT,
  zona_domicilio        VARCHAR(10),
  direccion_domicilio   VARCHAR(200),
  longitud              DECIMAL(11,8),
  latitud               DECIMAL(10,8),

  -- Laboral
  idprofesiones         INT,
  lugar_trabajo         VARCHAR(100),
  direccion_trabajo     VARCHAR(200),
  puesto_trabajo        VARCHAR(100),
  experiencia_laboral   JSON COMMENT 'Array de idexperiencia_laboral',

  -- Sistema
  activo                TINYINT      NOT NULL DEFAULT 1,
  fecha_creacion        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion    DATETIME     ON UPDATE CURRENT_TIMESTAMP,
  creado_por            VARCHAR(50),
  modificado_por        VARCHAR(50),

  FOREIGN KEY (idnacionalidades)   REFERENCES nacionalidades(idnacionalidades),
  FOREIGN KEY (idiglesias_bautizo) REFERENCES iglesias(idiglesias),
  FOREIGN KEY (idiglesias_anterior)REFERENCES iglesias(idiglesias),
  FOREIGN KEY (iddept_nacimiento)  REFERENCES departamentos(iddepartamentos),
  FOREIGN KEY (idmuni_nacimiento)  REFERENCES municipios(idmunicipios),
  FOREIGN KEY (iddept_domicilio)   REFERENCES departamentos(iddepartamentos),
  FOREIGN KEY (idmuni_domicilio)   REFERENCES municipios(idmunicipios),
  FOREIGN KEY (idprofesiones)      REFERENCES profesiones(idprofesiones)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS grupos_personas (
  idgrupos_personas INT AUTO_INCREMENT PRIMARY KEY,
  idpersonas        INT NOT NULL,
  idgrupos          INT NOT NULL,
  fecha_creacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_persona_grupo (idpersonas, idgrupos),
  FOREIGN KEY (idpersonas) REFERENCES personas(idpersonas) ON DELETE CASCADE,
  FOREIGN KEY (idgrupos)   REFERENCES grupos(idgrupos)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
