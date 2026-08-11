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
export const CURRENT_PRIVACY_VERSION = "1.0";
