import { InepSyncProcessor } from "../processors/inep-sync.processor";

import type { InepSyncService } from "../agents/inep-sync.service";
import type { InepSyncJobData } from "../processors/inep-sync.processor";
import type { Job } from "bullmq";

describe("InepSyncProcessor", () => {
  it("chama InepSyncService.sincronizar com o ano do job", async () => {
    const sincronizar = jest.fn().mockResolvedValue({});
    const inepSync = { sincronizar } as unknown as InepSyncService;
    const processor = new InepSyncProcessor(inepSync);
    const job = { id: "1", data: { ano: 2024 } } as Job<InepSyncJobData>;

    await processor.process(job);

    expect(sincronizar).toHaveBeenCalledWith(2024);
  });
});
