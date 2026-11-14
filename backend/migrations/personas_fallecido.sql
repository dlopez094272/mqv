-- ============================================================
-- Personas: marcar fallecidos (esquela)
-- Ejecutar en la base de datos mqv
-- ============================================================

-- Permite marcar a una persona como fallecida, con su fecha de fallecimiento.
-- Las personas fallecidas dejan de aparecer como disponibles para tomar
-- asistencia (y en el reconocimiento facial) y en el reporte de inasistentes,
-- pero su registro se conserva. En el calendario de cumpleañeros se muestran
-- con formato de esquela en vez de tarjeta de cumpleaños.
ALTER TABLE `personas`
  ADD COLUMN IF NOT EXISTS `fallecido` TINYINT(1) NOT NULL DEFAULT 0 AFTER `foto`,
  ADD COLUMN IF NOT EXISTS `fecha_fallecimiento` DATE NULL AFTER `fallecido`;
