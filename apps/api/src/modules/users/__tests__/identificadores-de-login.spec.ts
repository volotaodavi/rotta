import { UsersService } from "../users.service";

import type { ConsentRecordRepository } from "../repositories/consent-record.repository";
import type { MembershipRepository } from "../repositories/membership.repository";
import type { UserRepository } from "../repositories/user.repository";
import type { PasswordHasherService } from "@/infra/security/password-hasher.service";
import type { User } from "@prisma/client";

/**
 * Os três identificadores de login da Rotta resolvem a mesma conta,
 * seja qual for a grafia digitada.
 *
 * ## Por que estes testes existem
 *
 * Porque o mesmo defeito apareceu três vezes, num identificador de
 * cada vez, e as duas primeiras só foram descobertas por acaso.
 *
 * - **Telefone** (17/10/2026): gravado "(21) 99709-9557", procurado
 *   "21997099557". A conta existia e não abria.
 * - **E-mail**: o cadastro gravava em minúsculas e o login procurava
 *   exatamente o que foi digitado. O teclado do celular capitaliza a
 *   primeira letra por padrão, então "Ana@email.com" sai de um iPhone
 *   sem esforço nenhum. A recuperação de senha já normalizava, então a
 *   pessoa conseguia pedir a troca de senha e continuava sem entrar.
 * - **CPF**: `@IsCpf` validava e não normalizava, então
 *   "123.456.789-00" era gravado com máscara e o login, que procura
 *   dígitos, nunca mais achava.
 *
 * Nenhum dos três dá erro: dão "não foi possível entrar" com a senha
 * certa, que é o relato impossível de depurar pelo suporte.
 */
describe("identificadores de login", () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;

  const conta = { id: "user-1" } as User;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByTelefone: jest.fn().mockResolvedValue(null),
      findByCpf: jest.fn().mockResolvedValue(null),
      updateAuthState: jest.fn(),
      listAdminRottaIds: jest.fn(),
      listActiveIds: jest.fn(),
      listResponsavelIds: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    service = new UsersService(
      userRepository,
      {} as MembershipRepository,
      {} as ConsentRecordRepository,
      {} as PasswordHasherService,
    );
  });

  describe("findByIdentifier", () => {
    it.each([
      ["Ana@Email.com", "ana@email.com"],
      ["  ana@email.com  ", "ana@email.com"],
      ["ANA@EMAIL.COM", "ana@email.com"],
    ])("acha a conta pelo e-mail digitado como %j", async (digitado, procurado) => {
      userRepository.findByEmail.mockResolvedValue(conta);

      await expect(service.findByIdentifier(digitado)).resolves.toBe(conta);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(procurado);
    });

    it.each([
      ["(21) 99709-9557", "21997099557"],
      ["+55 21 99709-9557", "21997099557"],
      ["021 99709-9557", "21997099557"],
    ])("acha a conta pelo telefone digitado como %j", async (digitado, procurado) => {
      userRepository.findByTelefone.mockResolvedValue(conta);

      await expect(service.findByIdentifier(digitado)).resolves.toBe(conta);
      expect(userRepository.findByTelefone).toHaveBeenCalledWith(procurado);
    });

    it("acha a conta pelo CPF digitado com máscara", async () => {
      /* CPF e celular têm 11 dígitos, então o CPF é tentado primeiro e
         o telefone é o segundo palpite — a ordem importa e está em
         `findByIdentifier`. */
      userRepository.findByCpf.mockResolvedValue(conta);

      await expect(service.findByIdentifier("123.456.789-00")).resolves.toBe(conta);
      expect(userRepository.findByCpf).toHaveBeenCalledWith("12345678900");
    });
  });

  describe("assertNoDuplicateIdentity", () => {
    it("não deixa criar uma segunda conta com o mesmo e-mail em outra grafia", async () => {
      userRepository.findByEmail.mockResolvedValue(conta);

      await expect(
        service.assertNoDuplicateIdentity("Ana@Email.com", "21997099557"),
      ).rejects.toThrow("Este e-mail já possui uma conta. Fazer login?");
      expect(userRepository.findByEmail).toHaveBeenCalledWith("ana@email.com");
    });

    it("não deixa criar uma segunda conta com o mesmo CPF mascarado", async () => {
      userRepository.findByCpf.mockResolvedValue(conta);

      await expect(
        service.assertNoDuplicateIdentity("ana@email.com", "21997099557", "123.456.789-00"),
      ).rejects.toThrow("Este CPF já possui uma conta. Fazer login?");
      expect(userRepository.findByCpf).toHaveBeenCalledWith("12345678900");
    });

    it("não deixa criar uma segunda conta com o mesmo telefone em outro formato", async () => {
      userRepository.findByTelefone.mockResolvedValue(conta);

      await expect(
        service.assertNoDuplicateIdentity("ana@email.com", "+55 (21) 99709-9557"),
      ).rejects.toThrow("Este telefone já possui uma conta. Fazer login?");
      expect(userRepository.findByTelefone).toHaveBeenCalledWith("21997099557");
    });
  });
});
