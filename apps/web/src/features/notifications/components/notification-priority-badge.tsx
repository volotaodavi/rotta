import { Badge } from "@rotta/ui/web";

import { NOTIFICATION_PRIORITY_LABEL, NOTIFICATION_PRIORITY_VARIANT } from "../labels";

import type { NotificationPriorityLevel } from "@rotta/api-client";

export function NotificationPriorityBadge({
  prioridade,
}: {
  prioridade: NotificationPriorityLevel;
}): JSX.Element {
  return (
    <Badge variant={NOTIFICATION_PRIORITY_VARIANT[prioridade]}>
      {NOTIFICATION_PRIORITY_LABEL[prioridade]}
    </Badge>
  );
}
