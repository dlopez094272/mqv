-- ============================================================
-- Módulo Publicaciones — Distinción Noticia / Evento
-- Ejecutar en la base de datos mqv (después de publicaciones.sql)
-- ============================================================

ALTER TABLE `publicaciones`
  ADD COLUMN `tipo_publicacion` ENUM('noticia','evento') NOT NULL DEFAULT 'noticia' AFTER `estado`,
  ADD COLUMN `fecha_evento` DATETIME NULL AFTER `tipo_publicacion`;
