-- ============================================================
-- Módulo Publicaciones — Agregar tipo "Tema del Mes"
-- Ejecutar en la base de datos mqv (después de publicaciones_tipo.sql)
-- ============================================================

ALTER TABLE `publicaciones`
  MODIFY COLUMN `tipo_publicacion` ENUM('noticia','evento','tema_mes') NOT NULL DEFAULT 'noticia';
