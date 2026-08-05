/**
 * Nomes logicos das filas da plataforma — catalogo completo do Dossie
 * 14, Secoes 2.1 e 3. Com o motor QStash (Upstash — ver
 * `infra/queue/qstash/`), estes nomes nao sao mais filas fisicas
 * separadas: viram a `flowControlKey` passada a
 * `QstashPublisherService.publishJSON`, isolando o throughput de cada
 * tipo de job entre si mesmo todos batendo no mesmo endpoint HTTP de
 * entrega. Cada consumidor real usa sempre o mesmo nome daqui, nunca
 * uma string solta divergente.
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS_PUSH: "notifications-push",
  NOTIFICATIONS_WHATSAPP: "notifications-whatsapp",
  NOTIFICATIONS_SMS: "notifications-sms",
  NOTIFICATIONS_EMAIL: "notifications-email",
  NOTIFICATIONS_CRITICAL: "notifications-critical",
  GPS_PERSISTENCE: "gps-persistence",
  ETA_RECALC: "eta-recalc",
  GPS_MAINTENANCE: "gps-maintenance",
  DOCUMENTS_MAINTENANCE: "documents-maintenance",
  COMPLIANCE_RECALC: "compliance-recalc",
  REPORTS: "reports",
  AUTH_MAINTENANCE: "auth-maintenance",
  ENGAGEMENT: "engagement",
  BILLING: "billing",
  PRIVACY_MAINTENANCE: "privacy-maintenance",
  OBSERVABILITY_MAINTENANCE: "observability-maintenance",
  HEALTH_CHECKS: "health-checks",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
