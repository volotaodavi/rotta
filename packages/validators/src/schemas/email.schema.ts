import { z } from "zod";

/**
 * E-mail (Dossiê 15 `AUTH-01`) — normalizado (`trim` + minúsculas) antes
 * de validar, para que duas grafias do mesmo endereço (`Fulano@X.com` vs
 * `fulano@x.com`) resolvam à mesma identidade em checagens de duplicidade.
 */
export const emailSchema = z.string().trim().toLowerCase().email({ message: "E-mail inválido" });
