import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

/**
 * Hashing de senha com Argon2id (Dossie 12, Secao 7.1 — vencedor da
 * Password Hashing Competition, escolhido sobre bcrypt/scrypt por
 * resistencia superior a ataques com GPU/ASIC). Unico ponto do sistema
 * que conhece o algoritmo concreto — todo o resto do codigo depende
 * apenas desta interface, podendo trocar de algoritmo no futuro sem
 * tocar em nenhum outro modulo.
 */
@Injectable()
export class PasswordHasherService {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
