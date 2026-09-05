/**
 * Mascara o e-mail pro cartão de "Acesso rápido" (pedido do usuário
 * 05/09/2026: "e-mail em partes (con****@rottabr.com.br)") — mantém os
 * 3 primeiros caracteres do usuário e o domínio inteiro, só pra
 * confirmar visualmente de qual conta se trata sem expor o e-mail
 * completo numa tela que pode ser vista por cima do ombro.
 */
export function maskEmail(email: string): string {
  const arroba = email.indexOf("@");
  if (arroba <= 0) {
    return email;
  }
  const usuario = email.slice(0, arroba);
  const dominio = email.slice(arroba);
  const visiveis = usuario.slice(0, Math.min(3, usuario.length));
  return `${visiveis}****${dominio}`;
}
