import { UsersService } from "../users.service";

import type { ConsentRecordRepository } from "../repositories/consent-record.repository";
import type { MembershipRepository } from "../repositories/membership.repository";
import type { UserRepository } from "../repositories/user.repository";
import type { PasswordHasherService } from "@/infra/security/password-hasher.service";
import type { ConsentRecord } from "@prisma/client";

/**
 * Dossiê 45 FRENTE 5 — consentimento versionado. Cobre só os métodos
 * novos (`recordLgpdConsent`/`recordConsent`/`getPendingConsents`); o
 * resto de `UsersService` (login/senha/MFA) já é exercitado
 * indiretamente pelos testes de `AuthService`/`InvitesService`.
 */
describe("UsersService — consentimento versionado (Dossiê 45 FRENTE 5)", () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;
  let membershipRepository: jest.Mocked<MembershipRepository>;
  let consentRecordRepository: jest.Mocked<ConsentRecordRepository>;

  function buildConsentRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
    return {
      id: "consent-1",
      userId: "user-1",
      tipo: "TERMOS_DE_USO",
      versao: "1.1",
      aceitoEm: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByTelefone: jest.fn(),
      findByCpf: jest.fn(),
      updateAuthState: jest.fn(),
      listAdminRottaIds: jest.fn(),
    };

    membershipRepository = {
      listActiveByUserWithCompany: jest.fn(),
    } as unknown as jest.Mocked<MembershipRepository>;

    consentRecordRepository = {
      recordAcceptance: jest.fn(),
      listByUser: jest.fn().mockResolvedValue([]),
    };

    service = new UsersService(
      userRepository,
      membershipRepository,
      consentRecordRepository,
      {} as PasswordHasherService,
    );
  });

  describe("recordLgpdConsent", () => {
    it("grava o timestamp único (compat) E os dois ConsentRecord versionados de uma vez", async () => {
      await service.recordLgpdConsent("user-1");

      expect(userRepository.updateAuthState).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ consentimentoLgpdAceitoEm: expect.any(Date) }),
      );
      expect(consentRecordRepository.recordAcceptance).toHaveBeenCalledWith("user-1", [
        { tipo: "TERMOS_DE_USO", versao: "1.1" },
        { tipo: "POLITICA_PRIVACIDADE", versao: "1.0" },
      ]);
    });
  });

  describe("recordConsent", () => {
    it("grava só os tipos informados, na versão vigente de cada um", async () => {
      await service.recordConsent("user-1", ["POLITICA_PRIVACIDADE"]);

      expect(consentRecordRepository.recordAcceptance).toHaveBeenCalledWith("user-1", [
        { tipo: "POLITICA_PRIVACIDADE", versao: "1.0" },
      ]);
    });
  });

  describe("isAutonomoOuMei (regressão — 'motorista não credenciado' ao iniciar viagem)", () => {
    it("retorna true para o dono de uma empresa AUTONOMO", async () => {
      membershipRepository.listActiveByUserWithCompany.mockResolvedValue([
        { companyId: "company-1", company: { tipo: "AUTONOMO" } } as never,
      ]);

      await expect(service.isAutonomoOuMei("user-1", "company-1")).resolves.toBe(true);
    });

    it("retorna true para o dono de uma empresa MEI", async () => {
      membershipRepository.listActiveByUserWithCompany.mockResolvedValue([
        { companyId: "company-1", company: { tipo: "MEI" } } as never,
      ]);

      await expect(service.isAutonomoOuMei("user-1", "company-1")).resolves.toBe(true);
    });

    it("retorna false para outros CompanyType (ex. LTDA)", async () => {
      membershipRepository.listActiveByUserWithCompany.mockResolvedValue([
        { companyId: "company-1", company: { tipo: "LTDA" } } as never,
      ]);

      await expect(service.isAutonomoOuMei("user-1", "company-1")).resolves.toBe(false);
    });

    it("retorna false quando o usuário não tem vínculo ativo com essa empresa", async () => {
      membershipRepository.listActiveByUserWithCompany.mockResolvedValue([]);

      await expect(service.isAutonomoOuMei("user-1", "company-1")).resolves.toBe(false);
    });
  });

  describe("getPendingConsents", () => {
    it("retorna os dois tipos quando o usuário nunca aceitou nada", async () => {
      consentRecordRepository.listByUser.mockResolvedValue([]);

      const pending = await service.getPendingConsents("user-1");

      expect(pending.sort()).toEqual(["POLITICA_PRIVACIDADE", "TERMOS_DE_USO"].sort());
    });

    it("retorna vazio quando o usuário já aceitou as duas versões vigentes", async () => {
      consentRecordRepository.listByUser.mockResolvedValue([
        buildConsentRecord({ tipo: "TERMOS_DE_USO", versao: "1.1" }),
        buildConsentRecord({ tipo: "POLITICA_PRIVACIDADE", versao: "1.0" }),
      ]);

      const pending = await service.getPendingConsents("user-1");

      expect(pending).toEqual([]);
    });

    it("reaparece só o tipo cuja versão aceita ficou desatualizada (reprompt)", async () => {
      consentRecordRepository.listByUser.mockResolvedValue([
        buildConsentRecord({ tipo: "TERMOS_DE_USO", versao: "1.0" }), // versão vigente é 1.1
        buildConsentRecord({ tipo: "POLITICA_PRIVACIDADE", versao: "1.0" }),
      ]);

      const pending = await service.getPendingConsents("user-1");

      expect(pending).toEqual(["TERMOS_DE_USO"]);
    });

    it("usa sempre o registro mais recente de cada tipo (histórico com mais de um aceite)", async () => {
      consentRecordRepository.listByUser.mockResolvedValue([
        // já vem ordenado desc por aceitoEm (mesma garantia do repositório real)
        buildConsentRecord({
          tipo: "TERMOS_DE_USO",
          versao: "1.1",
          aceitoEm: new Date("2026-08-01"),
        }),
        buildConsentRecord({
          tipo: "TERMOS_DE_USO",
          versao: "1.0",
          aceitoEm: new Date("2026-01-01"),
        }),
        buildConsentRecord({
          tipo: "POLITICA_PRIVACIDADE",
          versao: "1.0",
          aceitoEm: new Date("2026-01-01"),
        }),
      ]);

      const pending = await service.getPendingConsents("user-1");

      expect(pending).toEqual([]);
    });
  });
});
