/**
 * @rotta/auth — sessao/autenticacao compartilhada do frontend (Dossie 12,
 * Secao 4 e Dossie 22, Secao 5.7).
 *
 * Responsabilidades previstas (a implementar junto com o primeiro fluxo
 * real de login, `AUTH-*` no Dossie 15):
 *   - Armazenamento seguro de token por plataforma (expo-secure-store no
 *     mobile, cookie httpOnly no web — Dossie 12 Secao 4.6)
 *   - Renovacao automatica de token (refresh rotation, Dossie 12 Secao 4.4)
 *   - Selecao de perfil quando o usuario tem multiplos VinculoPapel
 *   - Hooks/providers de sessao consumidos por apps/web, apps/admin e
 *     apps/mobile
 *
 * `token-storage.ts` é uma ponte temporária (ver seu próprio comentário)
 * para permitir testar módulos de negócio contra a API real antes do
 * Auth existir — não é a implementação final de sessão.
 */

export * from "./token-storage";
export * from "./company-context-storage";
