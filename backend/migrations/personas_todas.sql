-- ============================================================
-- Permiso especial "Personas: Ver todas (sin restricción de grupo)"
-- Ejecutar en la base de datos mqv
-- ============================================================

-- Permite a un usuario ver el listado completo de Personas sin la
-- restricción habitual de "solo personas de los grupos donde es encargado".
-- No otorga por sí solo acceso al módulo Personas (se sigue requiriendo
-- el permiso 'personas' con Consulta).
INSERT IGNORE INTO `mqv_ugrights` (`TableName`, `GroupID`, `AccessMask`) VALUES
  ('personas_todas', -1, 'S');
