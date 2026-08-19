/**
 * Notificação nativa do navegador (Notification API) — pedido do
 * usuário: "deverá aparecer uma notificação (push notification no
 * Google/Chrome/Safari) informando que a rota foi iniciada." Local, não
 * um Web Push remoto de verdade (isso exigiria par de chaves VAPID +
 * armazenar a inscrição por dispositivo + um servidor de envio — infra
 * nova que este pedido não pede: quem inicia a rota já está com o
 * próprio navegador aberto na hora, então uma notificação local
 * disparada nesse instante entrega exatamente o que foi pedido, sem
 * inventar escopo). Nunca pede permissão sem uma ação explícita do
 * usuário disparando (aqui, "iniciar rota") — pedir permissão sem
 * contexto é o jeito mais comum de um usuário negar de vez.
 */
export async function notifyRouteStarted(routeName: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const title = "Rota iniciada";
  const options: NotificationOptions = {
    body: `${routeName} começou agora — acompanhe o trajeto e os embarques em tempo real.`,
    icon: "/brand/rotta-mark-192.png",
    tag: "rotta-rota-iniciada",
  };

  // Preferir o Service Worker já registrado (`showNotification`) —
  // funciona mesmo com a aba em segundo plano, ao contrário de `new
  // Notification()`. Cai pro construtor direto quando não há SW pronto
  // (ex. navegador sem suporte a Service Worker).
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {
      // segue para o fallback abaixo
    }
  }

  try {
    // eslint-disable-next-line no-new -- notificação local, sem referência a manter
    new Notification(title, options);
  } catch {
    // Safari/navegadores que bloqueiam o construtor direto: sem
    // fallback adicional — a notificação simplesmente não aparece,
    // nunca quebra o fluxo de iniciar a rota por causa disso.
  }
}
