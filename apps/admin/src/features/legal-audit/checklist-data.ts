/**
 * FRENTE 6 — Auditoria de Consistência Legal ↔ Produto (Dossiê 45,
 * tarefa #206). Escopo definido na própria tarefa: "versão inicial
 * pode ser uma checklist curada, não totalmente automatizada" — cada
 * item abaixo foi conferido manualmente (texto real do documento legal
 * em `apps/web/src/app/legal/*` contra o código real do módulo citado
 * em `evidencia`), não gerado/adivinhado. Automatizar isso (comparar
 * texto vs. comportamento em CI) é um passo futuro de infraestrutura
 * de teste, fora do escopo desta v1.
 *
 * Reconferir e atualizar `ultimaRevisao` sempre que o documento legal
 * OU o módulo citado em `evidencia` mudar — este arquivo não se
 * autoatualiza.
 */

export type AuditItemStatus = "CONSISTENTE" | "PARCIAL" | "DIVERGENTE";

export interface AuditItem {
  id: string;
  area: string;
  documentoTitulo: string;
  /**
   * Caminho de referência dentro do site público (`apps/web`, ex.:
   * `/legal/motoristas#categoria-b`) — citação textual, não um link
   * clicável: `apps/admin` não tem hoje uma env var validada com a URL
   * do site público (só `NEXT_PUBLIC_API_URL`), e inventar uma só para
   * este link secundário seria escopo maior que o pedido desta v1.
   */
  documentoCaminho: string;
  alegacaoLegal: string;
  comportamentoReal: string;
  status: AuditItemStatus;
  evidencia: string;
  ultimaRevisao: string;
}

export const AUDIT_CHECKLIST: AuditItem[] = [
  {
    id: "categoria-b-nao-e-escolar",
    area: "Motoristas e modalidades",
    documentoTitulo: "Diretrizes para Motoristas e Modalidades",
    documentoCaminho: "/legal/motoristas#categoria-b",
    alegacaoLegal:
      "Categoria B não é apresentada pela Rotta como categoria oficial para transporte escolar — só fretamento ou particular.",
    comportamentoReal:
      "computeSchoolTransportEligibility só considera ELEGÍVEL motorista com CNH D/E + EAR + curso + antecedentes; categoria B nunca passa nesse motor.",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/drivers/school-transport-eligibility.util.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "selo-verificado-escolar",
    area: "Marketplace",
    documentoTitulo: "Diretrizes para Motoristas e Modalidades",
    documentoCaminho: "/legal/motoristas#marketplace",
    alegacaoLegal:
      'O selo "verificado" de transporte escolar só aparece quando pelo menos um motorista vinculado passou pela checagem completa — nunca só pela categoria do veículo que a empresa declarou.',
    comportamentoReal:
      "computeEscolarVerificado cruza Vehicle.categoria === ESCOLAR com o resultado real de computeSchoolTransportEligibility do motorista vinculado — corrigido no achado C1 desta mesma auditoria (antes só olhava a categoria autodeclarada).",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/marketplace/escolar-verification.util.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "documentos-armazenamento-privado",
    area: "Segurança / Documentos",
    documentoTitulo: "Segurança na Rotta",
    documentoCaminho: "/legal/seguranca",
    alegacaoLegal:
      "Documentos (CNH, comprovantes) ficam em armazenamento privado, nunca em URL pública e permanente — o acesso usa um link temporário e assinado, válido por curto período.",
    comportamentoReal:
      "SupabaseStorageService.uploadPrivate grava o path privado; a leitura sempre passa por getSignedUrl com TTL curto — corrigido no achado C3 desta auditoria (antes a URL de longa duração ficava armazenada e reutilizada).",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/storage/supabase-storage.service.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "gps-tempo-real-escopo",
    area: "GPS e localização",
    documentoTitulo: "Termos de Uso",
    documentoCaminho: "/legal/termos#gps",
    alegacaoLegal:
      "Durante uma viagem ativa, a localização do veículo é compartilhada em tempo real só com os responsáveis vinculados à rota — nunca pública.",
    comportamentoReal:
      "GET /gps/students/:id escopa por Student.responsavelId (via RBAC do token) e só retorna posição quando há Trip EM_ANDAMENTO vinculada à rota do aluno; nenhum endpoint de GPS aceita consulta pública.",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/gps/gps.controller.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "gps-meio-de-entrega",
    area: "GPS e localização",
    documentoTitulo: "Termos de Uso",
    documentoCaminho: "/legal/termos#gps",
    alegacaoLegal:
      '"Localização compartilhada em tempo real" — o documento não especifica o meio técnico.',
    comportamentoReal:
      'Hoje é polling REST a cada 10s (web e mobile), não push via WebSocket — dentro do que a promessa cobre (a posição chega "em tempo real" da perspectiva do responsável), mas é um detalhe de capacidade relevante sob carga (ver teste de carga desta mesma rodada).',
    status: "PARCIAL",
    evidencia: "apps/web/src/features/gps/hooks/use-gps.ts (refetchInterval: 10_000)",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "contrato-assinatura-eletronica",
    area: "Marketplace / Contratos",
    documentoTitulo: "Política de Contratação e Marketplace",
    documentoCaminho: "/legal/marketplace#contratos",
    alegacaoLegal:
      "Contrato só é ativado depois que família e transportadora confirmam individualmente a assinatura eletrônica simples pelo próprio painel/app.",
    comportamentoReal:
      "Contract.status vira ATIVO só quando assinadoResponsavelEm E assinadoEmpresaEm estão preenchidos — RottaAiService valida antes de liberar o transporte automaticamente.",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/marketplace/contracts.service.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "provedor-assinatura-externo-inativo",
    area: "Marketplace / Contratos",
    documentoTitulo: "Política de Contratação e Marketplace",
    documentoCaminho: "/legal/marketplace#contratos",
    alegacaoLegal:
      "A integração com um provedor externo de assinatura (validade jurídica/cadeia de custódia) ainda NÃO está ativa hoje — nenhum contrato depende dela para ser válido.",
    comportamentoReal:
      "AuthentiqueService é um stub honesto (interface pronta, sem chamada real à API do Authentique) — nenhum fluxo de contrato chama um provedor externo de fato.",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/marketplace/authentique.service.ts",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "consentimento-versionado",
    area: "Dados pessoais / LGPD",
    documentoTitulo: "Política de Privacidade",
    documentoCaminho: "/legal/privacidade",
    alegacaoLegal:
      "O tratamento de dados pessoais segue a Política de Privacidade vigente, com aceite registrado.",
    comportamentoReal:
      "MeResponse.pendingConsents lista tipos de documento (TERMOS_DE_USO/POLITICA_PRIVACIDADE) cuja versão vigente o usuário ainda não aceitou — reaceite bloqueante quando a versão muda (FRENTE 5, tarefa #204).",
    status: "CONSISTENTE",
    evidencia: "apps/api/src/modules/auth/auth.service.ts (pendingConsents)",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "exclusao-de-conta",
    area: "Dados pessoais / LGPD",
    documentoTitulo: "Política de Privacidade",
    documentoCaminho: "/legal/privacidade",
    alegacaoLegal:
      "É possível solicitar a exclusão da conta; pedidos de exclusão são analisados individualmente (o texto já é cuidadoso — não promete exclusão automática/instantânea).",
    comportamentoReal:
      "Não existe hoje nenhum endpoint, fila ou tela em Admin para registrar, rastrear ou processar um pedido de exclusão — o único canal é o e-mail de contato, sem ferramenta de suporte dedicada.",
    status: "PARCIAL",
    evidencia: "Nenhum resultado para deleteAccount/anonymize em apps/api/src/modules",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "app-responsavel-plataformas",
    area: "Cobertura de plataforma",
    documentoTitulo: "llms.txt / página inicial",
    documentoCaminho: "/",
    alegacaoLegal:
      '"Responsável: encontra uma transportadora, acompanha o transporte no mapa em tempo real" — sem especificar app vs. web.',
    comportamentoReal:
      "Até a tarefa #210 desta mesma rodada, a jornada do Responsável só existia no app mobile (não publicado em nenhuma loja) — o Painel Web não tinha nenhuma rota própria. Corrigido: /alunos + /alunos/:id/mapa agora existem no Painel Web com paridade de acompanhamento GPS.",
    status: "CONSISTENTE",
    evidencia: "apps/web/src/app/(dashboard)/alunos/[id]/mapa/page.tsx",
    ultimaRevisao: "2026-08-12",
  },
  {
    id: "app-nao-publicado-lojas",
    area: "Cobertura de plataforma",
    documentoTitulo: "—",
    documentoCaminho: "/governo",
    alegacaoLegal:
      'Nenhum documento legal ou página pública afirma que o app está disponível nas lojas — mas a ausência de aviso pode gerar expectativa não atendida ao tentar buscar "Rotta" na Play Store/App Store.',
    comportamentoReal:
      "O app mobile não está publicado em nenhuma loja hoje — falta conta de desenvolvedor paga (Apple/Google). Nenhuma alegação falsa no site, mas é um risco de expectativa a monitorar enquanto o Painel Web não cobrir 100% da jornada do Responsável.",
    status: "PARCIAL",
    evidencia: "Dossiê 35 — Go-Live, seção de publicação em lojas",
    ultimaRevisao: "2026-08-12",
  },
];
