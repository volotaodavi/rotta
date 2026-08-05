/**
 * Falha PERMANENTE de um job de fila (Dossie 14) — equivalente ao
 * `UnrecoverableError` do BullMQ, adaptado para o QStash: como o QStash
 * decide sozinho quando parar de tentar (baseado no status HTTP da
 * resposta, nao numa excecao lancada dentro de um Worker local), quem
 * lanca este erro dentro de um handler de `/internal/queue/*` esta
 * dizendo "nenhum retry resolve isto sozinho" — o handler deve
 * responder 2xx mesmo assim (nunca deixar o QStash reagendar algo que
 * nunca vai se resolver), so que apos registrar a falha definitiva
 * (ver `NotificationDeliveryController`/`GeoQueueController`).
 */
export class PermanentDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentDeliveryError";
  }
}
