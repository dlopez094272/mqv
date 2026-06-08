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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const logoUrl = `${frontendUrl}/logo.png`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sistema MQV</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
    <tr><td align="center" style="padding:32px 12px;">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(87,68,108,.15);max-width:580px;width:100%;">

        <!-- ── Header brand ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#53819A 0%,#57446C 100%);padding:32px 30px 28px;text-align:center;">
            <img src="${logoUrl}" alt="MQV" width="72" height="72"
                 style="display:block;margin:0 auto 14px;filter:brightness(0) invert(1);opacity:.95;border:0;"
                 onerror="this.style.display='none'" />
            <h1 style="color:#ffffff;margin:0 0 4px;font-size:15px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">IGLESIA DEL NAZARENO</h1>
            <p style="color:#A688BF;margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">MAS QUE VENCEDORES</p>
            <div style="width:44px;height:2px;background:#83D3EB;margin:16px auto 0;border-radius:2px;"></div>
          </td>
        </tr>

        <!-- ── Content ── -->
        <tr><td style="padding:36px 38px 30px;">${contenido}</td></tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#f8f5fc;padding:14px 20px;text-align:center;border-top:1px solid #e8e4f0;">
            <p style="margin:0;color:#A688BF;font-size:11px;">© 2026 Iglesia del Nazareno Mas que Vencedores · Sistema de Gestión</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailBienvenida(nombre, usuario, link) {
  return tplBase(`
    <h2 style="color:#57446C;margin:0 0 6px;font-size:20px;font-weight:800;">¡Bienvenido al sistema!</h2>
    <p style="color:#414042;font-size:15px;margin:0 0 12px;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#7D7E81;line-height:1.7;font-size:14px;margin:0 0 20px;">
      Se ha creado una cuenta para ti en el sistema de gestión de la
      <strong style="color:#57446C;">Iglesia del Nazareno Mas que Vencedores</strong>.
    </p>

    <!-- Código de usuario -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="background:linear-gradient(135deg,#f3f0f8 0%,#e8f4f8 100%);border-radius:10px;padding:20px 24px;border-left:4px solid #57446C;">
          <p style="margin:0 0 8px;color:#7D7E81;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Tu código de usuario</p>
          <p style="margin:0;font-size:30px;font-weight:900;color:#57446C;letter-spacing:5px;font-family:Courier New,Courier,monospace;">${usuario}</p>
          <p style="margin:10px 0 0;color:#c62828;font-size:12px;font-weight:700;">&#9888; Guarda este código — lo necesitarás para iniciar sesión.</p>
        </td>
      </tr>
    </table>

    <p style="color:#7D7E81;line-height:1.7;font-size:14px;margin:0 0 24px;">
      Haz clic en el botón a continuación para completar tu registro, configurar tu contraseña y subir tu foto de perfil:
    </p>

    <!-- Botón CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" fillcolor="#57446C"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Completar mi registro</center></v:roundrect><![endif]-->
          <a href="${link}"
             style="display:inline-block;background:linear-gradient(135deg,#53819A 0%,#57446C 100%);color:#ffffff;padding:14px 42px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.5px;mso-hide:all;">
            Completar mi registro
          </a>
        </td>
      </tr>
    </table>

    <p style="color:#c62828;font-size:12px;font-weight:700;margin:0 0 10px;">&#9888; Este enlace expira en 72 horas.</p>
    <p style="color:#ABADB0;font-size:12px;line-height:1.6;margin:0;">
      Si no esperabas este correo, puedes ignorarlo. Tu cuenta permanecerá inactiva hasta que completes el registro.
    </p>
  `);
}

function emailResetPassword(nombre, link) {
  return tplBase(`
    <h2 style="color:#57446C;margin:0 0 6px;font-size:20px;font-weight:800;">Restablecer contraseña</h2>
    <p style="color:#414042;font-size:15px;margin:0 0 12px;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#7D7E81;line-height:1.7;font-size:14px;margin:0 0 24px;">
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.<br/>
      Haz clic en el botón a continuación para continuar:
    </p>

    <!-- Botón CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" fillcolor="#57446C"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Restablecer mi contraseña</center></v:roundrect><![endif]-->
          <a href="${link}"
             style="display:inline-block;background:linear-gradient(135deg,#53819A 0%,#57446C 100%);color:#ffffff;padding:14px 42px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.5px;mso-hide:all;">
            Restablecer mi contraseña
          </a>
        </td>
      </tr>
    </table>

    <p style="color:#c62828;font-size:12px;font-weight:700;margin:0 0 10px;">&#9888; Este enlace expira en 24 horas.</p>
    <p style="color:#ABADB0;font-size:12px;line-height:1.6;margin:0;">
      Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
    </p>
  `);
}

function emailCumpleaneros(nombre) {
  return tplBase(`
    <div style="text-align:center;margin-bottom:30px;">
      <div style="font-size:60px;margin-bottom:8px;">🎂</div>
      <h1 style="font-family:Georgia,serif;color:#c62878;font-size:42px;margin:8px 0;font-style:italic;">
        ¡Felíz Cumpleaños!
      </h1>
      <h2 style="color:#57446C;font-size:24px;margin:0 0 18px;">${nombre}</h2>
      <div style="font-size:30px;letter-spacing:10px;">🎈🎁🎊🎈</div>
    </div>
    <div style="background:linear-gradient(135deg,#f3f0f8,#e8f4f8);border-radius:10px;padding:22px 28px;text-align:center;border-left:4px solid #57446C;">
      <p style="color:#7D7E81;line-height:1.8;font-size:15px;margin:0;">
        La <strong style="color:#57446C;">Iglesia del Nazareno Más que Vencedores</strong> te desea un<br/>
        maravilloso día lleno de bendiciones, alegría y amor.<br/>
        <strong style="color:#53819A;">¡Que Dios te llene de sus bendiciones este año!</strong>
      </p>
    </div>
    <p style="text-align:center;margin-top:22px;color:#ABADB0;font-size:13px;">
      Con cariño, tu familia en Cristo ✝
    </p>
  `);
}

module.exports = { sendMail, emailBienvenida, emailResetPassword, emailCumpleaneros };
