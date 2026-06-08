-- Módulo de correo integrado
-- Ejecutar contra la base de datos mqv

CREATE TABLE IF NOT EXISTS correo_credenciales (
  usuario        VARCHAR(50)  NOT NULL,
  correo_cuenta  VARCHAR(150) NOT NULL,
  contrasena_enc TEXT         NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario),
  CONSTRAINT fk_correo_usuario FOREIGN KEY (usuario)
    REFERENCES usuarios(usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
