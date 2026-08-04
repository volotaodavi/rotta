const BRAND_COLOR = "#3B6EF6";

export interface NotificationEmailData {
  titulo: string;
  corpo: string;
}

/** Escapa os únicos 3 caracteres que quebrariam o HTML — `titulo`/`corpo` são texto simples resolvido pelo chamador, nunca HTML de terceiros. */
function escapeHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Template HTML responsivo (briefing — "templates HTML responsivos")
 * para qualquer `Notification` enviada pelo canal E-mail. Layout à base
 * de tabelas com estilos inline (compatibilidade com clientes de e-mail
 * que ignoram `<style>`, ex. Outlook desktop) e `max-width: 600px` —
 * mesmo padrão consolidado de e-mails transacionais. Uma única
 * renderização serve TODOS os eventos: o conteúdo já vem personalizado
 * (`titulo`/`corpo`, briefing "Message Personalization AI") do
 * `NotificationsService`, então o template nunca decide o texto, só a
 * apresentação.
 */
export function renderNotificationEmailHtml(data: NotificationEmailData): string {
  const titulo = escapeHtml(data.titulo);
  const corpo = escapeHtml(data.corpo).replace(/\n/g, "<br>");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f7; font-family:Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_COLOR}; padding:20px 24px;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold;">Rotta</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;">
                <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">${titulo}</h1>
                <p style="margin:0; font-size:16px; line-height:24px; color:#374151;">${corpo}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px; background-color:#f9fafb; font-size:12px; color:#9ca3af;">
                Você recebeu este e-mail porque tem uma conta na Rotta. Gerencie suas preferências de notificação no app.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
