const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // SSL port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

function tplBase(contenido) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 10px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a237e 0%,#3949ab 100%);padding:30px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">✝</div>
            <h1 style="color:#ffd700;margin:0;font-size:20px;letter-spacing:1px;">IGLESIA DEL NAZARENO</h1>
            <p style="color:#c5cae9;margin:4px 0 0;font-size:14px;letter-spacing:2px;">MAS QUE VENCEDORES</p>
          </td>
        </tr>
        <tr><td style="padding:35px 40px;">${contenido}</td></tr>
        <tr>
          <td style="background:#f5f5f5;padding:15px;text-align:center;border-top:1px solid #e0e0e0;">
            <p style="margin:0;color:#9e9e9e;font-size:12px;">© 2026 Iglesia del Nazareno Mas que Vencedores · Sistema de Gestión</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailBienvenida(nombre, link) {
  return tplBase(`
    <h2 style="color:#1a237e;margin-top:0;">¡Bienvenido al sistema!</h2>
    <p style="color:#333;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#555;line-height:1.6;">Se ha creado una cuenta para ti en el sistema de gestión de la <strong>Iglesia del Nazareno Mas que Vencedores</strong>.</p>
    <p style="color:#555;line-height:1.6;">Haz clic en el botón a continuación para completar tu registro, configurar tu contraseña y subir tu foto de perfil:</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#1a237e,#3949ab);color:#ffd700;padding:14px 35px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:.5px;">Completar mi registro</a>
    </div>
    <p style="color:#e53935;font-size:13px;"><strong>⚠ Este enlace expira en 72 horas.</strong></p>
    <p style="color:#9e9e9e;font-size:12px;">Si no esperabas este correo, puedes ignorarlo. Tu cuenta permanecerá inactiva hasta que completes el registro.</p>
  `);
}

function emailResetPassword(nombre, link) {
  return tplBase(`
    <h2 style="color:#1a237e;margin-top:0;">Restablecer contraseña</h2>
    <p style="color:#333;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#555;line-height:1.6;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón a continuación:</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#1a237e,#3949ab);color:#ffd700;padding:14px 35px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:.5px;">Restablecer mi contraseña</a>
    </div>
    <p style="color:#e53935;font-size:13px;"><strong>⚠ Este enlace expira en 24 horas.</strong></p>
    <p style="color:#9e9e9e;font-size:12px;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.</p>
  `);
}

function emailCumpleaneros(nombre) {
  return tplBase(`
    <div style="text-align:center;margin-bottom:30px;">
      <div style="font-size:64px;">🎂</div>
      <h1 style="font-family:Georgia,serif;color:#e91e8c;font-size:48px;margin:10px 0;font-style:italic;">
        ¡Felíz Cumpleaños!
      </h1>
      <h2 style="color:#1a237e;font-size:28px;margin:0 0 20px;">${nombre}</h2>
      <div style="font-size:36px;letter-spacing:12px;">🎈🎁🎊🎈</div>
    </div>
    <div style="background:#fff5f8;border-radius:10px;padding:24px 30px;text-align:center;border-left:4px solid #e91e8c;">
      <p style="color:#555;line-height:1.8;font-size:16px;margin:0;">
        La <strong>Iglesia del Nazareno Más que Vencedores</strong> te desea un<br/>
        maravilloso día lleno de bendiciones, alegría y amor.<br/>
        <strong style="color:#1a237e;">¡Que Dios te llene de sus bendiciones este año!</strong>
      </p>
    </div>
    <p style="text-align:center;margin-top:24px;color:#9e9e9e;font-size:13px;">
      Con cariño, tu familia en Cristo ✝
    </p>
  `);
}

module.exports = { sendMail, emailBienvenida, emailResetPassword, emailCumpleaneros };
