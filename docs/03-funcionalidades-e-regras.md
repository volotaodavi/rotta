# Dossiê 3 — Funcionalidades e Regras de Negócio (Capítulos 12–13)

---

## Capítulo 12. Funcionalidades

Organizadas por módulo de domínio (os mesmos módulos que estruturam o backend — ver Capítulo 14). Cada funcionalidade indica a fase de entrega (MVP, V2, V3 — detalhado nos Capítulos 22–24).

### 12.1 Módulo — Identidade e Acesso
- Cadastro/login multi-perfil (e-mail, telefone, ou ambos) — **MVP**
- Autenticação por telefone com OTP (SMS/WhatsApp) para responsáveis, motoristas e monitores (menor fricção que senha) — **MVP**
- Login com e-mail/senha + 2FA opcional para Gestores/Empresa/Admin — **MVP**
- SSO (Google) para painel web de Gestor/Empresa — **V2**
- Gestão de permissões granulares por perfil (RBAC) — **MVP**
- Múltiplos vínculos: um responsável pode ter filhos em empresas de transporte diferentes; um motorista pode (raramente) atender mais de uma empresa — **MVP** (modelo de dados já suporta desde o início, ver Capítulo 16)

### 12.2 Módulo — Gestão de Empresas (Tenant)
- Autocadastro (self-service signup) — **MVP**
- Escolha e gestão de plano/assinatura — **MVP**
- Faturamento recorrente automático (cartão/Pix) — **MVP**
- Múltiplas filiais/unidades operacionais sob uma mesma empresa-mãe — **V2**
- Hierarquia Secretaria → Empresas terceirizadas — **V3**

### 12.3 Módulo — Gestão de Veículos
- Cadastro (placa, modelo, ano, capacidade de lugares, foto) — **MVP**
- Upload e controle de vencimento de documentos (CRLV, seguro, vistoria/laudo de vistoria escolar municipal) — **MVP**
- Alertas de vencimento (30/15/5 dias) — **MVP**
- Vínculo veículo ↔ rota ↔ motorista — **MVP**
- Histórico de manutenção (registro manual de revisões) — **V2**
- Telemetria veicular avançada (velocidade, frenagem brusca, integração com OBD) — **V3**

### 12.4 Módulo — Gestão de Motoristas e Monitores
- Cadastro com upload de documentos (CNH, categoria, cursos obrigatórios, antecedentes) — **MVP**
- Status de verificação documental (pendente/aprovado/reprovado/vencido) — **MVP**
- Escalas e vínculo a rotas — **MVP**
- Substituição rápida de motorista/monitor em uma rota (motorista reserva) — **MVP**
- Avaliação/reputação (nota do responsável sobre a viagem) — **V2**
- Certificações e treinamentos com validade (ex.: curso de direção defensiva) — **V2**

### 12.5 Módulo — Gestão de Alunos
- Cadastro (nome, data de nascimento, foto, escola, endereço de embarque/desembarque, necessidades especiais relevantes ao transporte — ex.: cadeirante) — **MVP**
- Vínculo a um ou mais responsáveis — **MVP**
- Vínculo a uma rota e ponto de parada específico — **MVP**
- Lista de pessoas autorizadas a retirar a criança (além do fluxo padrão casa-escola) — **MVP**
- Calendário de exceções (ex.: "não vai à escola às sextas") — **V2**
- Integração de frequência escolar (cruzamento com sistema da escola) — **V3**

### 12.6 Módulo — Gestão de Responsáveis
- Cadastro/convite, múltiplos responsáveis por aluno (ex.: pai e mãe, cada um com o próprio login) — **MVP**
- Preferências de notificação (canais, silenciar fora de horário de rota) — **MVP**
- Justificativa de falta/ausência do aluno pelo app — **MVP**
- Chat direto (dentro do app) com o motorista/gestor para casos não urgentes — **V2**

### 12.7 Módulo — Gestão de Escolas
- Cadastro de escola (nome, endereço, contato) pela empresa transportadora — **MVP**
- Portal de visualização (somente leitura) para a escola: alunos em rota, status do dia, ocorrências — **MVP**
- Múltiplas empresas transportadoras atendendo a mesma escola, com visão consolidada para a escola — **V2**
- Canal de comunicação formal escola ↔ transportador dentro da plataforma — **V2**

### 12.8 Módulo — Gestão de Rotas
- Criação visual de rota no mapa (pontos, ordem, horários) — **MVP**
- Rotas por turno (manhã/tarde/integral) e por dia da semana — **MVP**
- Duplicar/clonar rota existente — **MVP**
- Otimização automática sugerida de ordem de paradas (baseada em distância/trânsito) — **V2**
- Simulação de impacto ao adicionar/remover um aluno da rota (tempo adicional estimado) — **V2**
- Rotas dinâmicas/sob demanda (fora do escopo — não é o modelo de negócio da Rotta, que é rota fixa recorrente) — **fora de escopo**

### 12.9 Módulo — Rastreamento em Tempo Real
- Transmissão de GPS via app do motorista (sem necessidade de hardware dedicado) — **MVP**
- Mapa ao vivo para responsável (trecho relevante ao filho) — **MVP**
- Mapa ao vivo consolidado (todas as rotas) para gestor — **MVP**
- Geofencing para detectar chegada automática a pontos de parada — **MVP**
- Cálculo de ETA (tempo estimado de chegada) por parada — **MVP**
- Replay/histórico de trajeto percorrido — **MVP**
- Detecção de desvio de rota não planejado com alerta ao gestor — **V2**
- Suporte a hardware de rastreamento dedicado (para veículos maiores/frotas que já possuem equipamento) como fonte alternativa de GPS — **V3**

### 12.10 Módulo — Checklist Operacional
- Checklist de embarque por aluno, por parada — **MVP**
- Checklist de desembarque por aluno, por parada — **MVP**
- Confirmação ativa de "van vazia" ao fim da rota — **MVP**
- Registro de ausência com submotivo — **MVP**
- Checklist de vistoria pré-viagem do veículo (pneus, cintos, extintor — itens básicos de segurança) — **V2**
- Assinatura digital do responsável no ponto (para casos de alta exigência de comprovação) — **V3**

### 12.11 Módulo — Comunicação e Notificações
- Notificações push (embarque, desembarque, atraso, ocorrência) — **MVP**
- Envio via WhatsApp Business API (mesmo conteúdo das push, para famílias que preferem/não têm o app aberto) — **MVP**
- SMS como canal de fallback (quando push e WhatsApp falham ou não há app instalado) — **MVP**
- Comunicados em massa (por rota/escola/toda a base) — **MVP**
- Botão de emergência/SOS (motorista e responsável) — **MVP**
- Chat bidirecional dentro do app — **V2**
- Central de atendimento/chatbot para dúvidas frequentes de responsáveis — **V3**

### 12.12 Módulo — Agenda
- Calendário de rotas ativas por dia — **MVP**
- Marcação de feriados/dias sem transporte — **MVP**
- Eventos especiais (passeio escolar, horário alterado) — **V2**

### 12.13 Módulo — Dashboard Operacional
- Visão do dia (rotas ativas, atrasadas, concluídas) — **MVP**
- Indicadores-chave (pontualidade média, ocorrências no mês, documentos vencendo) — **MVP**
- Mapa consolidado de toda a frota — **MVP**
- Análises comparativas por motorista/rota/período — **V2**
- Score de risco operacional (combinação de atrasos, ocorrências, documentos, comportamento de condução) — **V3**

### 12.14 Módulo — Documentos
- Repositório central de documentos por entidade (empresa, veículo, motorista, aluno) — **MVP**
- Alertas de vencimento configuráveis — **MVP**
- Extração automática de dados do documento via OCR (preenchimento assistido, reduz erro de digitação) — **V2**
- Assinatura eletrônica de contratos (motorista ↔ empresa, empresa ↔ responsável) — **V2**

### 12.15 Módulo — Relatórios
- Relatórios operacionais (pontualidade, frequência, ocorrências) exportáveis em PDF/planilha — **MVP**
- Relatórios financeiros da própria assinatura Rotta — **MVP**
- Relatórios de conformidade documental para prestação de contas a escolas — **V2**
- Relatórios agregados para órgãos públicos (B2G) — **V3**

### 12.16 Módulo — Financeiro (cobrança do transportador aos responsáveis)
*(Fora do MVP — é uma funcionalidade de valor agregado, não o core de rastreamento/gestão operacional)*
- Emissão de cobrança da mensalidade do transporte aos responsáveis — **V2**
- Conciliação e relatório de inadimplência — **V2**
- Split de pagamento avançado / conta digital para o transportador — **V3**

---

## Capítulo 13. Regras de negócio

### 13.1 Regras de assinatura e cobrança

- **RN-01**: O plano é único, R$ 39,90/mês, cobrado por Empresa cadastrada (tenant), independente do número de veículos, motoristas ou alunos vinculados a ela.
- **RN-02**: Responsáveis, motoristas, monitores e escolas nunca são cobrados diretamente pela Rotta, em nenhuma circunstância, em nenhuma fase do produto.
- **RN-03**: A cobrança é recorrente mensal, com tentativa automática de novo cobro em caso de falha (D+1, D+3, D+7). Após 3 falhas consecutivas, a conta entra em **modo restrito**: cadastros e alterações são bloqueados, mas o rastreamento e checklist de rotas já configuradas **continuam funcionando por até 15 dias adicionais** — nunca se interrompe uma operação de transporte de crianças em andamento por inadimplência, por razão de segurança e reputação da marca. Após o prazo de carência total, a conta é suspensa (dados retidos, não excluídos, conforme política de retenção do Capítulo 19).
- **RN-04**: Não há cobrança proporcional (pro-rata) complexa: o primeiro mês pode ser oferecido com trial gratuito (ex.: 14 dias) definido por estratégia comercial, mas a partir daí a cobrança é sempre pelo ciclo mensal cheio.
- **RN-05**: Uma empresa só é considerada "tenant ativo" para fins de métricas de negócio quando tiver ao menos 1 veículo, 1 motorista e 1 rota configurados — isso evita contar cadastros abandonados como clientes ativos.

### 13.2 Regras de permissão e acesso (RBAC)

- **RN-06**: Um usuário pode ter mais de um papel simultaneamente em tenants diferentes (ex.: é responsável em uma empresa e gestor em outra), mas dentro de um mesmo tenant possui exatamente um conjunto de papéis ativo.
- **RN-07**: Gestor tem acesso irrestrito aos dados **do seu próprio tenant** apenas — nunca a outro tenant, sob nenhuma circunstância (isolamento reforçado por RLS no banco, ver Capítulo 15).
- **RN-08**: Escola tem acesso **somente leitura**, e apenas aos dados de alunos vinculados a ela — nunca vê dados de alunos de outras escolas atendidas pela mesma empresa transportadora.
- **RN-09**: Responsável só acessa dados do(s) próprio(s) filho(s) vinculado(s) à sua conta, nunca de outros alunos da mesma rota (privacidade entre famílias, mesmo sendo o mesmo veículo).
- **RN-10**: Administrador Rotta tem acesso cross-tenant, mas **todo acesso a dados de um tenant específico gera log de auditoria imutável** (quem acessou, quando, o quê) — inclusive para a própria equipe interna.
- **RN-11**: Apenas o motorista designado (ou substituto formalmente registrado) pode iniciar uma rota — o app rejeita o início por qualquer outro perfil.

### 13.3 Regras de operação da viagem

- **RN-12**: Uma rota só pode ser marcada como "finalizada" mediante confirmação ativa de "van vazia" pelo motorista/monitor — nunca automaticamente por geolocalização ou tempo decorrido.
- **RN-13**: Se um aluno esperado em um ponto não for marcado como "embarcou" nem como "ausente justificado" em até N minutos após o horário previsto (configurável, padrão 15 min), o sistema dispara um alerta automático ao motorista **e** ao gestor, pedindo confirmação explícita do status daquele aluno antes de permitir seguir viagem sem justificativa.
- **RN-14**: Ausência do aluno pode ser justificada previamente pelo responsável (véspera ou mesmo dia, até X minutos antes do horário da rota); ausência não justificada e não embarcada gera notificação ao responsável perguntando o motivo.
- **RN-15**: Atraso é calculado como a diferença entre o horário previsto de um ponto e o horário real estimado (via ETA recalculado); ultrapassado o limiar configurável (padrão 10 minutos), o responsável recebe notificação proativa automaticamente, sem ação humana necessária.
- **RN-16**: O motorista não pode remover um aluno de uma rota diretamente pelo app de campo — apenas o gestor (ou o próprio motorista, quando ele acumula o papel de gestor/dono) pode alterar a composição de uma rota, para evitar erro operacional em campo.
- **RN-17**: Uma ocorrência classificada como grave (acidente, emergência médica, criança em risco) dispara notificação imediata simultânea por push + WhatsApp + SMS a todos os canais do responsável e ao gestor, ignorando qualquer preferência de "silenciar notificações" configurada pelo usuário — segurança prevalece sobre preferência de UX.

### 13.4 Regras de conformidade documental

- **RN-18**: Um motorista com CNH vencida é automaticamente bloqueado de iniciar qualquer rota no app — bloqueio técnico, não apenas alerta visual — até a regularização do documento ser confirmada pelo gestor.
- **RN-19**: Um veículo com documento obrigatório vencido (CRLV, seguro, laudo de vistoria escolar) segue a mesma regra de bloqueio de RN-18.
- **RN-20**: Alertas de vencimento documental são enviados ao gestor em 3 marcos (30, 15 e 5 dias antes), e ao próprio motorista/proprietário do documento nos mesmos marcos.
- **RN-21**: O bloqueio por documento vencido (RN-18/19) pode ser configurado por tenant como "bloqueio rígido" (padrão, recomendado) ou "apenas alerta" para tenants em regiões onde a regulação municipal ainda não exige tal documento — mas o padrão de fábrica é sempre o mais seguro.

### 13.5 Regras de dados e privacidade (fundamentos que aprofundam no Capítulo 19)

- **RN-22**: Dados de crianças (menores de idade) são tratados como categoria de dado sensível reforçado, mesmo que a LGPD não os classifique tecnicamente como "dado sensível" no mesmo grau de dados de saúde/biometria — política interna da Rotta eleva o padrão de proteção por ser o compromisso central da marca.
- **RN-23**: Nenhum dado de aluno ou responsável é usado para fins de publicidade, venda a terceiros, ou treinamento de modelos de terceiros fora do propósito de operação do produto.
- **RN-24**: O responsável legal pode solicitar exclusão dos dados do aluno a qualquer momento; a exclusão é efetivada após o fim de qualquer vínculo ativo de rota, preservando o histórico mínimo exigido por obrigação legal/contratual de retenção (ex.: comprovação de viagens para fins de disputa comercial), sempre anonimizado após o prazo de retenção.
- **RN-25**: Localização em tempo real de um veículo só é visível a responsáveis com aluno **ativo naquela rota naquele dia** — um responsável não pode ver a localização do veículo em dias que o filho não vai usar o transporte (ex.: sabe que a rota nem vai passar), reduzindo superfície de exposição de dados de terceiros (outros alunos, motorista).

### 13.6 Regras de ciclo de vida de entidades

- **RN-26**: Um aluno não pode ser vinculado a duas rotas ativas com o mesmo turno simultaneamente (evita inconsistência operacional — uma criança não pode "estar em dois vans ao mesmo tempo" do ponto de vista do sistema).
- **RN-27**: Ao desligar um motorista/monitor de uma empresa, suas rotas ficam automaticamente sinalizadas como "sem motorista designado" no dashboard do gestor até nova atribuição — nunca ficam "silenciosamente" sem operador.
- **RN-28**: Exclusão de uma empresa (tenant) é sempre um processo de *soft delete* com período de retenção antes de purga definitiva (ver Capítulo 19), nunca exclusão física imediata, para permitir recuperação em caso de cancelamento acidental ou disputa de cobrança.
