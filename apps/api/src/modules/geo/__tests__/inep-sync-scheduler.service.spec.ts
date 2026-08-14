import { InepSyncSchedulerService } from "../agents/inep-sync-scheduler.service";

import type { GeoConfig } from "@/config/geo.config";
import type { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";
import type { ConfigService } from "@nestjs/config";

function buildConfigService(geo: Partial<GeoConfig> = {}): ConfigService {
  const config: GeoConfig = {
    nominatimBaseUrl: "https://nominatim.openstreetmap.org",
    nominatimUserAgent: "RottaGeoPlatform/1.0",
    osrmBaseUrl: "https://router.project-osrm.org",
    inepSyncCron: undefined,
    inepSyncAno: undefined,
    ...geo,
  };
  return { get: jest.fn().mockReturnValue(config) } as unknown as ConfigService;
}

describe("InepSyncSchedulerService", () => {
  it("não registra nenhum agendamento quando o QStash não está configurado (nem com INEP_SYNC_CRON setado)", async () => {
    const qstashSchedule = {
      isConfigured: false,
      upsertSchedule: jest.fn(),
    } as unknown as QstashScheduleService;
    const service = new InepSyncSchedulerService(
      buildConfigService({ inepSyncCron: "0 3 * * *" }),
      qstashSchedule,
    );

    await service.onModuleInit();

    expect(qstashSchedule.upsertSchedule).not.toHaveBeenCalled();
  });

  it("usa o cron padrão mensal quando o QStash está configurado mas INEP_SYNC_CRON não foi setado (pedido do usuário: 'QStash já está no Render')", async () => {
    const qstashSchedule = {
      isConfigured: true,
      upsertSchedule: jest.fn().mockResolvedValue(undefined),
    } as unknown as QstashScheduleService;
    const service = new InepSyncSchedulerService(buildConfigService(), qstashSchedule);

    await service.onModuleInit();

    expect(qstashSchedule.upsertSchedule).toHaveBeenCalledWith(
      "inep-sync-nacional",
      "geo/inep-sync",
      "0 4 1 * *",
      { ano: new Date().getFullYear() - 1 },
    );
  });

  it("respeita INEP_SYNC_CRON quando explicitamente setado, em vez do padrão", async () => {
    const qstashSchedule = {
      isConfigured: true,
      upsertSchedule: jest.fn().mockResolvedValue(undefined),
    } as unknown as QstashScheduleService;
    const service = new InepSyncSchedulerService(
      buildConfigService({ inepSyncCron: "0 3 * * *", inepSyncAno: 2023 }),
      qstashSchedule,
    );

    await service.onModuleInit();

    expect(qstashSchedule.upsertSchedule).toHaveBeenCalledWith(
      "inep-sync-nacional",
      "geo/inep-sync",
      "0 3 * * *",
      { ano: 2023 },
    );
  });
});
