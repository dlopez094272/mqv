-- ============================================================
-- Módulo Crecimiento: Gestión de Cursos y Contenido
-- ============================================================

-- Cursos
CREATE TABLE IF NOT EXISTS cursos (
  idcursos     INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(200)  NOT NULL,
  descripcion  TEXT,
  logo         VARCHAR(255),
  color        VARCHAR(7)    NOT NULL DEFAULT '#3788d8',
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  created_by   VARCHAR(100),
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES usuarios(usuario) ON DELETE SET NULL
);

-- Contenido / guía del curso
CREATE TABLE IF NOT EXISTS cursos_contenido (
  idcontenido          INT AUTO_INCREMENT PRIMARY KEY,
  idcursos             INT           NOT NULL,
  titulo               VARCHAR(200)  NOT NULL,
  descripcion          TEXT,
  video_filename       VARCHAR(255),
  video_nombre_original VARCHAR(255),
  orden                INT           NOT NULL DEFAULT 0,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idcursos) REFERENCES cursos(idcursos) ON DELETE CASCADE
);

-- Archivos de soporte por bloque de contenido
CREATE TABLE IF NOT EXISTS cursos_archivos (
  idarchivo       INT AUTO_INCREMENT PRIMARY KEY,
  idcontenido     INT           NOT NULL,
  nombre_original VARCHAR(255)  NOT NULL,
  filename        VARCHAR(255)  NOT NULL,
  mimetype        VARCHAR(100),
  tamanio         BIGINT,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idcontenido) REFERENCES cursos_contenido(idcontenido) ON DELETE CASCADE
);

-- Preguntas de evaluación del curso
CREATE TABLE IF NOT EXISTS cursos_preguntas (
  idpregunta  INT AUTO_INCREMENT PRIMARY KEY,
  idcursos    INT  NOT NULL,
  pregunta    TEXT NOT NULL,
  orden       INT  NOT NULL DEFAULT 0,
  FOREIGN KEY (idcursos) REFERENCES cursos(idcursos) ON DELETE CASCADE
);

-- Opciones de cada pregunta (selección múltiple)
CREATE TABLE IF NOT EXISTS cursos_opciones (
  idopcion    INT AUTO_INCREMENT PRIMARY KEY,
  idpregunta  INT          NOT NULL,
  texto       TEXT         NOT NULL,
  es_correcta TINYINT(1)   NOT NULL DEFAULT 0,
  orden       INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (idpregunta) REFERENCES cursos_preguntas(idpregunta) ON DELETE CASCADE
);

-- Asignaciones de cursos a usuarios del sistema
CREATE TABLE IF NOT EXISTS cursos_asignaciones (
  idasignacion  INT AUTO_INCREMENT PRIMARY KEY,
  idcursos      INT          NOT NULL,
  usuario       VARCHAR(100) NOT NULL,
  asignado_por  VARCHAR(100),
  asignado_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asignacion (idcursos, usuario),
  FOREIGN KEY (idcursos) REFERENCES cursos(idcursos) ON DELETE CASCADE
);

-- Evaluaciones realizadas por los usuarios
CREATE TABLE IF NOT EXISTS cursos_evaluaciones (
  idevaluacion  INT AUTO_INCREMENT PRIMARY KEY,
  idcursos      INT           NOT NULL,
  usuario       VARCHAR(100)  NOT NULL,
  puntaje       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  aprobado      TINYINT(1)    NOT NULL DEFAULT 0,
  completado_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idcursos) REFERENCES cursos(idcursos) ON DELETE CASCADE
);

-- Respuestas individuales de cada evaluación
CREATE TABLE IF NOT EXISTS cursos_respuestas (
  idrespuesta  INT AUTO_INCREMENT PRIMARY KEY,
  idevaluacion INT NOT NULL,
  idpregunta   INT NOT NULL,
  idopcion     INT NOT NULL,
  FOREIGN KEY (idevaluacion) REFERENCES cursos_evaluaciones(idevaluacion) ON DELETE CASCADE
);
