import { ServiceUnavailableException } from "@nestjs/common";

import { SupabaseStorageService } from "../supabase-storage.service";

import type { StorageConfig } from "@/config/storage.config";
import type { ConfigService } from "@nestjs/config";

function buildConfigService(storage: StorageConfig): ConfigService {
  return { get: jest.fn().mockReturnValue(storage) } as unknown as ConfigService;
}

const CONFIGURED: StorageConfig = {
  supabaseUrl: "https://project.supabase.co",
  supabaseServiceRoleKey: "service-role-key",
  bucket: "rotta-documents",
  publicBucket: "rotta-public",
};

describe("SupabaseStorageService", () => {
  describe("onModuleInit", () => {
    it("loga um aviso explícito no boot quando SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes (Dossiê 31 §4)", () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
          publicBucket: "rotta-public",
        }),
      );
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Armazenamento de arquivos"));
    });

    it("não loga nada no boot quando a configuração está completa", () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("upload (bucket público — logo/foto de empresa e de veículo)", () => {
    it("recusa o upload com um erro claro quando não configurado (nunca falha silenciosamente)", async () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
          publicBucket: "rotta-public",
        }),
      );

      await expect(
        service.upload("companies/1/logo.png", Buffer.from("fake"), "image/png"),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("envia ao bucket público e retorna a URL pública (Dossiê 32)", async () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const from = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://cdn.test/rotta-public/companies/1/logo.png" },
        }),
      });
      service["client"] = { storage: { from } } as never;

      const url = await service.upload("companies/1/logo.png", Buffer.from("fake"), "image/png");

      expect(from).toHaveBeenCalledWith("rotta-public");
      expect(url).toBe("https://cdn.test/rotta-public/companies/1/logo.png");
    });
  });

  describe("uploadPrivate (bucket privado — documento de motorista/veículo, foto de aluno)", () => {
    it("recusa o upload com um erro claro quando não configurado (nunca falha silenciosamente)", async () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
          publicBucket: "rotta-public",
        }),
      );

      await expect(
        service.uploadPrivate("students/1/foto.png", Buffer.from("fake"), "image/png"),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("envia ao bucket privado e retorna { path, url } assinada de curta validade, nunca getPublicUrl (Dossiê 32)", async () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const getPublicUrl = jest.fn();
      const createSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: "https://cdn.test/rotta-documents/students/1/foto.png?token=abc" },
        error: null,
      });
      const from = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl,
        createSignedUrl,
      });
      service["client"] = { storage: { from } } as never;

      const result = await service.uploadPrivate(
        "students/1/foto.png",
        Buffer.from("fake"),
        "image/png",
      );

      expect(from).toHaveBeenCalledWith("rotta-documents");
      expect(result).toEqual({
        path: "students/1/foto.png",
        url: "https://cdn.test/rotta-documents/students/1/foto.png?token=abc",
      });
      expect(getPublicUrl).not.toHaveBeenCalled();
      // 15 minutos (Dossiê 45, achado C3) — nunca os 10 anos de antes.
      expect(createSignedUrl).toHaveBeenCalledWith("students/1/foto.png", 60 * 15);
    });

    it("propaga erro claro quando a assinatura da URL falha", async () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const from = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        createSignedUrl: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "bucket not found" } }),
      });
      service["client"] = { storage: { from } } as never;

      await expect(
        service.uploadPrivate("drivers/1/documents/x.pdf", Buffer.from("fake"), "application/pdf"),
      ).rejects.toThrow("Falha ao gerar URL assinada");
    });
  });

  describe("getSignedUrl (Dossiê 45, achado C3 — reassinatura de curta validade a cada leitura)", () => {
    it("assina uma URL nova para um path já existente, com TTL curto por padrão", async () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const createSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: "https://cdn.test/rotta-documents/drivers/1/cnh.pdf?token=fresh" },
        error: null,
      });
      const from = jest.fn().mockReturnValue({ createSignedUrl });
      service["client"] = { storage: { from } } as never;

      const url = await service.getSignedUrl("drivers/1/cnh.pdf");

      expect(from).toHaveBeenCalledWith("rotta-documents");
      expect(createSignedUrl).toHaveBeenCalledWith("drivers/1/cnh.pdf", 60 * 15);
      expect(url).toBe("https://cdn.test/rotta-documents/drivers/1/cnh.pdf?token=fresh");
    });

    it("aceita um TTL explícito quando o chamador precisa de outra duração", async () => {
      const service = new SupabaseStorageService(buildConfigService(CONFIGURED));
      const createSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: "https://cdn.test/x?token=y" },
        error: null,
      });
      const from = jest.fn().mockReturnValue({ createSignedUrl });
      service["client"] = { storage: { from } } as never;

      await service.getSignedUrl("drivers/1/cnh.pdf", 3600);

      expect(createSignedUrl).toHaveBeenCalledWith("drivers/1/cnh.pdf", 3600);
    });

    it("recusa quando não configurado (nunca falha silenciosamente)", async () => {
      const service = new SupabaseStorageService(
        buildConfigService({
          supabaseUrl: undefined,
          supabaseServiceRoleKey: undefined,
          bucket: "rotta-documents",
          publicBucket: "rotta-public",
        }),
      );

      await expect(service.getSignedUrl("drivers/1/cnh.pdf")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
