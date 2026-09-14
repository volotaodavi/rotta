/**
 * Fonte única das versões atuais de Termos de Uso e Política de
 * Privacidade exigidas no aceite (Dossiê 45 FRENTE 5 — lacuna já
 * registrada no Dossiê 43 §"Deferido": "hoje só existe
 * `consentimentoLgpdAceitoEm`, um timestamp único, sem versão").
 *
 * Precisam acompanhar manualmente `LegalDocumentMeta.versao` de
 * "termos"/"privacidade" em `apps/web/src/features/legal/documents.ts`
 * — os dois apps não compartilham pacote para este dado hoje (o CMS de
 * documentos legais, FRENTE 4, ainda não existe; quando existir, esta
 * constante passa a ser lida do banco em vez de hardcoded aqui). Ao
 * publicar uma nova versão de qualquer um dos dois documentos,
 * atualizar a constante correspondente aqui também — do contrário
 * usuários já cadastrados nunca serão reavisados para reaceitar
 * (`UsersService.getPendingConsents`).
 */
export const CURRENT_TERMS_VERSION = "1.1";
// 14/09/2026 — 1.0 → 1.2: acompanha `LegalDocumentMeta` de "privacidade"
// em `apps/web/src/features/legal/documents.ts` (que já estava em "1.1"
// sem esta constante ter sido atualizada junto — divergência anterior
// corrigida de propósito aqui). Mudança real de conteúdo: Responsável
// deixou de informar CPF no cadastro.
export const CURRENT_PRIVACY_VERSION = "1.2";
