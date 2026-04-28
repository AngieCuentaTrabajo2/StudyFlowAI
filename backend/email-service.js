const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "StudyFlow AI <onboarding@resend.dev>";
const appPublicUrl = (process.env.APP_PUBLIC_URL || "http://localhost:5173").replace(/\/$/, "");

function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function construirUrlVerificacionCorreo(token) {
  return `${appPublicUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

export async function enviarCorreo({ para, asunto, html, texto }) {
  if (!resendApiKey) {
    console.warn("[email] RESEND_API_KEY no configurada. No se envio el correo.");
    return { ok: false, omitido: true, motivo: "RESEND_API_KEY no configurada" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [para],
      subject: asunto,
      html,
      text: texto,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(detalle || `Resend respondio con HTTP ${response.status}`);
  }

  return { ok: true };
}

export function construirCorreoVerificacion({ nombres, token }) {
  const url = construirUrlVerificacionCorreo(token);
  const nombre = escapeHtml(nombres || "estudiante");

  return {
    asunto: "Verifica tu correo en StudyFlow AI",
    texto: `Hola ${nombres || "estudiante"}, confirma tu correo entrando a este enlace: ${url}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">Verifica tu correo</h1>
        <p>Hola ${nombre}, confirma que este correo te pertenece para activar avisos por email en StudyFlow AI.</p>
        <p style="margin: 28px 0;">
          <a href="${url}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Verificar correo
          </a>
        </p>
        <p style="font-size: 13px; color: #475569;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `,
  };
}

export function construirCorreoNotificacion({ titulo, mensaje }) {
  const tituloSeguro = escapeHtml(titulo);
  const mensajeSeguro = escapeHtml(mensaje);

  return {
    asunto: `StudyFlow AI: ${titulo}`,
    texto: `${titulo}\n\n${mensaje}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">${tituloSeguro}</h1>
        <p style="line-height: 1.55;">${mensajeSeguro}</p>
        <p style="font-size: 13px; color: #64748b; margin-top: 28px;">Recibiste este aviso porque activaste notificaciones por correo en StudyFlow AI.</p>
      </div>
    `,
  };
}
