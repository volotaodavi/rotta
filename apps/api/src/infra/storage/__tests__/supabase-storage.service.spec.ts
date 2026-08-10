import { ServiceUnavailableException } from "@nestjs/common";

import { SupabaseStorageService } from "../supabase-storage.service";

import type { StorageConfig } from "@/config/storage.config";
import type { ConfigService } from "@nestjs/config";

function buildConfigService(storage: StorageConfig): ConfigService {
  return { get: jest.fn().mockReturnValue(storage) } as unknown as ConfigService;
}

describe("SupabaseStorageService", () => {
  describe("onModuleInit", () => {
    it("loga um aviso explícito no boot quando SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes (Dossiê 31 §4)", () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
        }),
      );
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Armazenamento de arquivos"));
    });

    it("não loga nada no boot quando a configuração está completa", () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: "https://project.supabase.co",
          supabaseServiceRoleKey: "service-role-key",
          bucket: "rotta-documents",
        }),
      );
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("upload", () => {
    it("recusa o upload com um erro claro quando não configurado (nunca falha silenciosamente)", async () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
        }),
      );

      await expect(
        service.upload("companies/1/logo.png", Buffer.from("fake"), "image/png"),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
