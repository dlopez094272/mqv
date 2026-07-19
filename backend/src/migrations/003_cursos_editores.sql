-- ============================================================
-- Módulo Crecimiento: Editores adicionales de curso
-- Permite al creador de un curso (o superadmin) otorgar acceso
-- de edición a otros usuarios del sistema.
-- ============================================================

CREATE TABLE IF NOT EXISTS cursos_editores (
  ideditor     INT AUTO_INCREMENT PRIMARY KEY,
  idcursos     INT          NOT NULL,
  usuario      VARCHAR(100) NOT NULL,
  agregado_por VARCHAR(100),
  agregado_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_curso_editor (idcursos, usuario),
  FOREIGN KEY (idcursos) REFERENCES cursos(idcursos) ON DELETE CASCADE,
  FOREIGN KEY (usuario)  REFERENCES usuarios(usuario) ON DELETE CASCADE
);
