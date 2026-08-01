# Especificação Funcional Oficial da Rotta — Parte 4: Rotas, GPS, Embarque e Desembarque

> Continuação da Parte 3 (`docs/17-...`). Códigos de funcionalidade: `ROT-*` (Rotas), `GPS-*` (Rastreamento), `EMB-*` (Embarque), `DESEMB-*` (Desembarque). Esta parte cobre o núcleo operacional em tempo real da plataforma — a área de maior exigência de precisão desta especificação, dado o impacto direto em segurança.

---

## ROT-01 — Criação de Rota

**Objetivo**: modelar estruturalmente uma rota — o "template" recorrente que dará origem a uma `Viagem` a cada dia efetivamente operado.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: ao menos um veículo `aprovado` e um motorista `aprovado` cadastrados no tenant.

**Fluxo principal**: ver Dossiê 11 §7.5 (fluxo completo já especificado em nível de UX) — nome, turno, dias da semana (`ROT-04`), veículo/motorista/monitor padrão, sequência de paradas com alunos vinculados (`ROT-07`).

**Fluxos alternativos**: criação sem alunos vinculados ainda (rota "esqueleto", populada depois) — permitida, mas a rota permanece com status `pausada` até ter ao menos um aluno ativo vinculado (não pode ser iniciada como viagem vazia).

**Regras de negócio**: motorista e veículo padrão devem estar com status `aprovado` no momento da criação (validação de `RN-18`/`RN-19` antecipada para o momento de montagem, não apenas no início da viagem); uma rota pertence a exatamente um tenant.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: nome de rota não pode ser vazio; ao menos uma parada deve existir para a rota ser marcada como `ativa` (não apenas `pausada`).

**Mensagens exibidas**: "Rota criada. Adicione paradas e alunos para ativá-la."; erro — "Selecione um motorista com documentação em dia."

**Casos excepcionais**: tentativa de criar rota com motorista/veículo bloqueado — a lista de seleção já filtra apenas elegíveis (mesma lógica de `DRV-09`), tornando esse erro praticamente inatingível pela UI, mas ainda validado no backend como defesa em profundidade.

**Critérios de aceite**:

- **Dado** um motorista e veículo aprovados, **quando** o Gestor cria uma rota com ao menos uma parada e um aluno, **então** a rota é criada com status `ativa`.
- **Dado** uma rota criada sem nenhum aluno vinculado, **quando** isso ocorre, **então** ela permanece com status `pausada` até receber ao menos um vínculo de aluno ativo.

**Possíveis melhorias futuras**: modelos de rota pré-configurados (templates) para tenants que replicam um padrão comum entre múltiplas rotas semelhantes.

---

## ROT-02 — Edição de Rota

**Objetivo**: permitir ajustes na composição de uma rota existente, preservando o histórico de configurações anteriores.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: rota existente.

**Fluxo principal**: edição de qualquer campo de `ROT-01`; cada alteração estrutural relevante (parada adicionada/removida, motorista/veículo padrão trocado) gera uma versão preservada (Dossiê 8 §9.1), permitindo reconstituir "como era a rota" em qualquer data.

**Fluxos alternativos**: edição durante uma viagem em andamento daquela rota — alterações estruturais (paradas, alunos) só produzem efeito a partir da **próxima** viagem; a viagem em curso continua com a configuração vigente no momento em que foi iniciada (consistência operacional — nunca modificar o "chão" de uma viagem já em progresso).

**Regras de negócio**: mesma validação de elegibilidade de motorista/veículo de `ROT-01` aplicada a qualquer reatribuição de padrão.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: idênticas a `ROT-01`.

**Mensagens exibidas**: "Rota atualizada. As alterações valem a partir da próxima viagem."

**Casos excepcionais**: edição simultânea por dois Gestores — last-write-wins com registro de auditoria de ambas as tentativas (mesmo padrão de `EMP-02`).

**Critérios de aceite**:

- **Dado** uma rota com viagem em andamento, **quando** o Gestor remove um aluno da composição, **então** a viagem em curso não é afetada, mas a próxima viagem já reflete a remoção.

**Possíveis melhorias futuras**: nenhuma identificada além do já coberto.

---

## ROT-03 — Duplicação de Rota

**Objetivo**: permitir a criação rápida de uma nova rota a partir de uma existente, útil para rotas semelhantes (ex. mesma região, turno oposto).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: rota de origem existente.

**Fluxo principal**:

1. Gestor acessa a rota de origem → "Duplicar".
2. Sistema cria uma nova rota com as mesmas paradas e configuração, exceto: nome (sufixado, ex. "Cópia de Rota Manhã"), motorista/veículo (deixados em branco, forçando escolha explícita), e alunos vinculados (nunca duplicados automaticamente — evita o erro grave de um mesmo aluno acabar em duas rotas simultâneas por engano, RN-26).
3. Gestor ajusta o necessário e salva.

**Fluxos alternativos**: nenhum.

**Regras de negócio**: alunos nunca são copiados no processo de duplicação — decisão deliberada de segurança de dado, dado o risco de violação de `RN-26` se copiados sem revisão humana explícita.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: nova rota segue as mesmas validações de `ROT-01` antes de poder ser ativada.

**Mensagens exibidas**: "Rota duplicada. Revise motorista, veículo e alunos antes de ativar."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** uma rota com 5 paradas, **quando** o Gestor a duplica, **então** a nova rota tem as mesmas 5 paradas, mas nenhum aluno vinculado e nenhum motorista/veículo padrão definido.

**Possíveis melhorias futuras**: opção explícita de "duplicar também os alunos" com uma tela de confirmação dedicada, para operações que genuinamente precisam disso (ex. rota de ida e volta com exatamente os mesmos alunos).

---

## ROT-04 — Dias da Semana da Rota

**Objetivo**: definir em quais dias da semana uma rota efetivamente opera.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: nenhum além de `ROT-01`.

**Fluxo principal**: seleção múltipla de dias (seg–dom) durante a criação/edição da rota.

**Fluxos alternativos**: rotas com dias alternados (ex. só terças e quintas) — suportadas nativamente pela mesma seleção múltipla, sem necessidade de funcionalidade adicional.

**Regras de negócio**: uma `Viagem` só é gerada/permitida para os dias marcados como ativos na rota; tentativa de iniciar viagem em um dia não configurado é bloqueada (`GPS-01`).

**Permissões**: Gestor.

**Validações**: ao menos um dia deve ser selecionado.

**Mensagens exibidas**: erro (ao tentar iniciar viagem em dia não configurado) — "Esta rota não está configurada para operar hoje."

**Casos excepcionais**: feriado caindo em um dia normalmente ativo — tratado pela Agenda (`AGE-01`, Parte 6), não por esta configuração estrutural (a rota continua "configurada" para aquele dia da semana; é o calendário de feriados que suprime a expectativa de viagem naquela data específica).

**Critérios de aceite**:

- **Dado** uma rota configurada para segunda a sexta, **quando** um motorista tenta iniciar viagem num sábado, **então** o sistema bloqueia com mensagem explicativa.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## ROT-05 — Substituição de Motorista (troca pontual ou permanente)

**Objetivo**: permitir a reatribuição rápida do motorista de uma rota, seja permanentemente (mudança de escala) ou pontualmente (imprevisto do dia).

**Descrição**: já referenciada como a implementação operacional de `DRV-09` (Parte 2).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: motorista substituto com status `aprovado` e disponibilidade compatível.

**Fluxo principal**:

1. Gestor acessa a rota (ou a viagem do dia, se a substituição for pontual e a viagem já estiver em andamento) → "Substituir motorista".
2. Sistema lista apenas motoristas elegíveis (aprovados, sem bloqueio documental).
3. Gestor escolhe o escopo: "somente hoje" ou "permanentemente".
4. Sistema efetiva a substituição, publica o evento `motorista.trocado`, e dispara notificação aos responsáveis da rota.

**Fluxos alternativos**: substituição solicitada com a viagem já em andamento (ex. motorista passou mal no meio do trajeto) — o motorista substituto assume a viagem em progresso a partir daquele ponto; o histórico da viagem preserva corretamente qual motorista conduziu cada trecho.

**Regras de negócio**: evento `motorista.trocado` (Dossiê 14 §4.1) sempre gera registro de auditoria e notificação — nunca uma troca silenciosa do ponto de vista da família.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: motorista substituto não pode estar bloqueado por documento vencido; verificação de disponibilidade gera aviso (não bloqueio) em caso de conflito de agenda.

**Mensagens exibidas**: "Motorista substituído com sucesso. As famílias desta rota foram notificadas."

**Casos excepcionais**: ver `CASO-05` (Parte 7).

**Critérios de aceite**:

- **Dado** uma viagem em andamento, **quando** o Gestor realiza uma substituição pontual de motorista, **então** o restante da viagem passa a ser conduzido pelo substituto e os responsáveis recebem notificação da mudança.

**Possíveis melhorias futuras**: sugestão automática do motorista substituto mais adequado (V3, Analytics).

---

## ROT-06 — Substituição de Veículo

**Objetivo**: permitir a troca do veículo de uma rota, pontual ou permanentemente.

**Descrição**: mesmo padrão de `ROT-05`, aplicado ao veículo — já referenciada em `DRV-08` (Parte 2).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: veículo substituto com status `aprovado` e capacidade compatível com o número de alunos da rota (`VEI-03`).

**Fluxo principal**: análogo a `ROT-05`, publicando o evento `veiculo.trocado`.

**Fluxos alternativos**: veículo substituto com capacidade insuficiente para o número de alunos da rota — sistema bloqueia a substituição até que a composição de alunos seja ajustada ou um veículo de capacidade adequada seja escolhido.

**Regras de negócio**: `RN-CAP-01` (Parte 2, `VEI-03`) aplicada também neste fluxo.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: capacidade do veículo substituto ≥ número de alunos ativos vinculados à rota.

**Mensagens exibidas**: "Veículo substituído com sucesso."; erro — "Este veículo tem capacidade para 12 alunos, mas a rota tem 15 vinculados. Escolha outro veículo ou ajuste a rota."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** uma rota com 15 alunos, **quando** o Gestor tenta substituir por um veículo de capacidade 12, **então** o sistema bloqueia a substituição com mensagem explicativa.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## ROT-07 — Sequência de Paradas e Alunos

**Objetivo**: definir a ordem física das paradas de uma rota e quais alunos embarcam/desembarcam em cada uma.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: rota criada.

**Fluxo principal**: ver Dossiê 11 §7.5 — interface de mapa interativo, adição de parada por clique/busca de endereço, reordenação por arrastar, vínculo de aluno a uma parada específica de embarque e outra de desembarque (podem diferir).

**Fluxos alternativos**: reordenação em massa via arrastar múltiplas paradas; remoção de uma parada com alunos vinculados — sistema exige realocar os alunos para outra parada antes de permitir a remoção (nunca deixa um aluno "órfão" de parada).

**Regras de negócio**: `RN-26` (aluno não pode estar em duas rotas ativas do mesmo turno) validada no momento do vínculo aluno-parada, não apenas na criação da rota.

**Permissões**: exclusivo de Gestor.

**Validações**: cada parada deve ter horário previsto preenchido; a ordem das paradas deve ser sequencial sem lacunas.

**Mensagens exibidas**: erro — "Este aluno já está vinculado a outra rota ativa no mesmo turno. Remova o vínculo anterior primeiro."

**Casos excepcionais**: duas paradas com endereços muito próximos (mesma rua) — sistema não impede, mas sugere consolidação em uma única parada para otimizar o tempo de trajeto.

**Critérios de aceite**:

- **Dado** uma rota com 4 paradas, **quando** o Gestor reordena arrastando a 3ª parada para a 1ª posição, **então** a nova ordem é persistida e refletida no app do motorista na próxima viagem.
- **Dado** um aluno já vinculado a uma rota ativa do turno da manhã, **quando** o Gestor tenta vinculá-lo a outra rota do mesmo turno, **então** o sistema bloqueia com mensagem explicativa (`RN-26`).

**Possíveis melhorias futuras**: ver `ROT-08` (otimização automática).

---

## ROT-08 — Otimização de Rota

**Objetivo**: sugerir automaticamente uma ordem de paradas mais eficiente (menor tempo/distância total), reduzindo o esforço manual do Gestor.

**Descrição**: funcionalidade de V2 (Dossiê 3 §12.8) — usa o adapter de mapas (Google Directions, Dossiê 9 §2.6) para calcular a sequência de menor custo total entre as paradas já cadastradas.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: rota com 3 ou mais paradas cadastradas (abaixo disso, a otimização não produz ganho relevante).

**Fluxo principal**:

1. Gestor acessa a rota → "Sugerir otimização".
2. Sistema calcula a sequência de menor tempo/distância total, mantendo fixos os pontos de origem/destino obrigatórios (ex. chegada final na escola no horário certo).
3. Sistema apresenta a sugestão lado a lado com a ordem atual (comparação de tempo estimado).
4. Gestor aceita, ajusta manualmente, ou descarta a sugestão.

**Fluxos alternativos**: Gestor com restrições operacionais que a otimização pura não captura (ex. "sempre pego este aluno primeiro por acordo com a família") — a sugestão nunca é aplicada automaticamente sem revisão humana, precisamente para acomodar esse tipo de exceção legítima que o algoritmo não conhece.

**Regras de negócio**: a sugestão nunca altera a rota automaticamente — sempre requer confirmação explícita do Gestor (o sistema sugere, o humano decide, alinhado ao princípio de UX do Dossiê 10).

**Permissões**: Gestor.

**Validações**: nenhuma além da rota ter paradas suficientes para o cálculo fazer sentido.

**Mensagens exibidas**: "Encontramos uma ordem que pode economizar 8 minutos por viagem. Aplicar?"

**Casos excepcionais**: falha do provedor de mapas ao calcular a otimização — sistema informa a indisponibilidade temporária e mantém a ordem atual inalterada, nunca bloqueia a operação da rota por essa funcionalidade de conveniência estar fora do ar.

**Critérios de aceite**:

- **Dado** uma rota com 6 paradas, **quando** o Gestor solicita a otimização e aceita a sugestão, **então** a nova ordem é aplicada e refletida na próxima viagem.
- **Dado** uma indisponibilidade do provedor de mapas, **quando** a otimização é solicitada, **então** o sistema informa a falha sem alterar a rota existente.

**Possíveis melhorias futuras**: otimização considerando dados históricos reais de trânsito por horário (não apenas a distância), usando o próprio histórico de viagens da Rotta como insumo (V3, Analytics).

---

## GPS-01 — Início da Viagem (ativação do rastreamento)

**Objetivo**: iniciar formalmente a execução diária de uma rota, ativando a transmissão de localização.

**Usuários envolvidos**: Motorista.

**Pré-requisitos**: motorista e veículo com status `aprovado`; rota configurada para o dia da semana corrente (`ROT-04`); (V2) verificação facial bem-sucedida (`DRV-04`).

**Fluxo principal**: ver Dossiê 9 §5.2 e Dossiê 11 §7.9 — motorista aperta "Iniciar rota" → permissão de localização em segundo plano confirmada → sistema cria a `Viagem` com status `em_andamento` → GPS de alta frequência ativado.

**Fluxos alternativos**: início pontual fora do horário previsto (motorista atrasado saindo de casa) — permitido normalmente; o atraso é calculado a partir da comparação entre o horário real de início e o previsto, alimentando `GPS-atraso` (Dossiê 3, RN-15), não bloqueando o início em si.

**Regras de negócio**: `RN-11` (só o motorista titular/substituto designado pode iniciar); `RN-18`/`RN-19` (bloqueio por documento vencido); só é possível uma `Viagem` `em_andamento` por rota por dia (não é possível "iniciar duas vezes").

**Permissões**: exclusivo do Motorista designado.

**Validações**: ver regras acima.

**Mensagens exibidas**: "Rota iniciada. Boa viagem!"; erro — "Você não pode iniciar esta rota — CNH vencida. Regularize seu documento." (`RN-18`); erro — "Já existe uma viagem em andamento para esta rota hoje."

**Casos excepcionais**: ver `CASO-13` (Parte 7, motorista tenta iniciar rota sem GPS disponível).

**Critérios de aceite**:

- **Dado** um motorista aprovado com veículo aprovado, **quando** ele inicia a rota dentro de um dia configurado, **então** a viagem é criada e o rastreamento é ativado.
- **Dado** um motorista com CNH vencida, **quando** ele tenta iniciar a rota, **então** o sistema bloqueia com mensagem explicativa (`RN-18`).

**Possíveis melhorias futuras**: nenhuma além das já cobertas nos módulos relacionados.

---

## GPS-02 — Fim da Viagem (encerramento do rastreamento)

**Objetivo**: encerrar formalmente a execução da viagem, com a confirmação de segurança obrigatória de van vazia.

**Usuários envolvidos**: Motorista.

**Pré-requisitos**: viagem `em_andamento`; todos os alunos esperados processados no checklist (embarcados/ausentes justificados).

**Fluxo principal**: ver Dossiê 11 §3.3/7.10 — tela dedicada de confirmação explícita ("Confirmo que o veículo está vazio", com exigência de _long-press_, Dossiê 11 §8) → viagem marcada `finalizada` → GPS de alta frequência desativado.

**Fluxos alternativos**: motorista tenta finalizar com alunos ainda não processados no checklist da última parada — sistema bloqueia a finalização até que todos sejam processados.

**Regras de negócio**: `RN-12` — nunca automatizável por tempo/geolocalização; sempre exige a confirmação ativa e explícita.

**Permissões**: exclusivo do Motorista da viagem em curso.

**Validações**: todos os alunos da rota processados no checklist antes de permitir a tela de confirmação de van vazia.

**Mensagens exibidas**: "Viagem finalizada com sucesso."; erro — "Ainda há alunos sem checklist concluído nesta parada."

**Casos excepcionais**: nenhum além do já coberto (ver `TRIP`/`EMB`/`DESEMB` para o detalhe do checklist).

**Critérios de aceite**:

- **Dado** todos os alunos processados, **quando** o motorista confirma explicitamente van vazia, **então** a viagem é finalizada e o histórico é consolidado.
- **Dado** ao menos um aluno sem checklist concluído, **quando** o motorista tenta finalizar, **então** o sistema bloqueia com mensagem clara.

**Possíveis melhorias futuras**: nenhuma — esta é uma funcionalidade de segurança crítica, deliberadamente resistente a "melhorias" que reduzam fricção.

---

## GPS-03 — Atualização em Tempo Real

**Objetivo**: transmitir e exibir a posição do veículo em rota com latência mínima aos usuários autorizados.

**Descrição**: ver Dossiê 9 §5.2/5.3 e Dossiê 14 §1 para o detalhamento arquitetural completo — esta entrada formaliza o comportamento funcional esperado, não a implementação técnica.

**Usuários envolvidos**: Motorista (origem), Responsável, Gestor (destino).

**Pré-requisitos**: viagem `em_andamento`.

**Fluxo principal**: posição capturada a cada 5–10s → processada (geofencing, coerência) → distribuída via canal em tempo real → refletida no mapa do cliente autorizado em até poucos segundos.

**Fluxos alternativos**: nenhum além de `GPS-04`/`GPS-05` (offline/reconexão).

**Regras de negócio**: Responsável só recebe atualização do trecho relevante ao próprio filho (`RN-25`); Escola nunca recebe coordenada bruta (apenas status agregado).

**Permissões**: escopo de canal por papel, conforme RBAC (Dossiê 12 §5.2).

**Validações**: posição geograficamente incoerente é sinalizada, não descartada silenciosamente (Capítulo 19.3) — o Gestor pode ver o sinalizador de "possível imprecisão de GPS" no dashboard.

**Mensagens exibidas**: indicador de frescor de dado ("atualizado agora"/"atualizado há X min", Dossiê 8 §6.6).

**Casos excepcionais**: ver `GPS-04`/`GPS-05`.

**Critérios de aceite**:

- **Dado** uma viagem em andamento, **quando** o motorista se move, **então** o responsável autorizado vê a posição atualizada no mapa em até 10 segundos (Dossiê 4 §20.4, SLO de referência).

**Possíveis melhorias futuras**: nenhuma além das já cobertas na arquitetura (Dossiê 14).

---

## GPS-04 — Modo Offline

**Objetivo**: garantir que a operação de campo (GPS e checklist) continue funcionando mesmo sem conectividade momentânea.

**Descrição**: ver Dossiê 14 §1.7 para o detalhamento técnico completo.

**Usuários envolvidos**: Motorista, Monitor.

**Pré-requisitos**: nenhum — o comportamento é sempre ativo como rede de segurança, não uma funcionalidade "ligada" manualmente.

**Fluxo principal**: perda de conectividade detectada → app continua capturando GPS e permitindo checklist normalmente, gravando tudo localmente → indicador visual discreto informa "sem conexão — seus dados serão sincronizados assim que possível" → ao reconectar, sincronização automática em segundo plano (`GPS-05`).

**Fluxos alternativos**: perda de conectividade prolongada (toda a viagem sem sinal) — todos os dados da viagem são sincronizados de uma vez ao final, preservando a ordem correta pelos timestamps gerados no dispositivo.

**Regras de negócio**: nenhuma ação crítica de campo (GPS, checklist, confirmação de van vazia) é bloqueada pela ausência de conectividade.

**Permissões**: idênticas ao fluxo normal.

**Validações**: idempotência por chave única gerada no dispositivo (Dossiê 14 §1.7), evitando duplicidade ao sincronizar.

**Mensagens exibidas**: "Sem conexão — continuamos registrando sua viagem normalmente."; "Conectado novamente. Sincronizando dados..."

**Casos excepcionais**: ver `CASO-01` e `CASO-02` (Parte 7).

**Critérios de aceite**:

- **Dado** um motorista sem conectividade durante toda a viagem, **quando** a conexão retorna ao final, **então** todos os pontos de GPS e eventos de checklist são sincronizados corretamente, na ordem real de ocorrência.

**Possíveis melhorias futuras**: indicador de "quantos itens pendentes de sincronização" visível ao motorista para transparência.

---

## GPS-05 — Reconexão

**Objetivo**: restabelecer o fluxo de dados em tempo real de forma transparente após uma interrupção de rede, sem exigir ação manual do usuário.

**Usuários envolvidos**: Motorista, Responsável, Gestor.

**Pré-requisitos**: conexão perdida e restabelecida.

**Fluxo principal (uplink, motorista)**: fila local reenvia os lotes pendentes com backoff exponencial (Dossiê 14 §1.6).

**Fluxo principal (downlink, responsável/gestor)**: cliente Socket.IO reconecta automaticamente; ao reconectar, solicita um snapshot do estado atual via REST antes de voltar a confiar em atualizações incrementais (Dossiê 9 §5.3).

**Fluxos alternativos**: nenhum.

**Regras de negócio**: o cliente nunca deve exibir uma posição desatualizada como se fosse corrente sem o indicador de frescor (`GPS-03`).

**Permissões**: idênticas ao fluxo normal.

**Validações**: nenhuma além da idempotência já descrita em `GPS-04`.

**Mensagens exibidas**: "Reconectado. Atualizando informações."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** um responsável que perdeu conexão por 2 minutos durante o acompanhamento, **quando** a conexão retorna, **então** o app solicita e exibe a posição mais recente real (não uma posição de 2 minutos atrás sem indicação).

**Possíveis melhorias futuras**: nenhuma identificada além das já cobertas.

---

## GPS-06 — Precisão do GPS

**Objetivo**: lidar de forma transparente e segura com variações na qualidade/precisão do sinal de localização.

**Usuários envolvidos**: Motorista (origem do dado), Gestor (monitoramento de qualidade).

**Pré-requisitos**: nenhum.

**Fluxo principal**: cada posição capturada carrega um valor de precisão (metros) reportado pelo próprio GPS do aparelho; posições com precisão muito baixa (ex. acima de um limiar configurável) são armazenadas mas sinalizadas, e podem ser suavizadas/descartadas apenas para fins de exibição no mapa (nunca descartadas do histórico bruto, que preserva o dado real recebido).

**Fluxos alternativos**: sinal de GPS ausente por período prolongado (ex. túnel, área de sombra de sinal) — sistema mantém a última posição conhecida exibida com indicador claro de "sem sinal há X minutos", nunca "teletransporta" o marcador para a próxima posição capturada sem transição.

**Regras de negócio**: posição geograficamente incoerente com o histórico recente (salto impossível dado o tempo decorrido) é sinalizada como `simulado_suspeito` (Dossiê 8 §11.1) e gera alerta ao Gestor para investigação, sem interromper a operação normal da viagem.

**Permissões**: leitura da qualidade de sinal disponível a Gestor (nível agregado); Motorista vê apenas indicação simples no próprio app ("sinal de GPS fraco").

**Validações**: nenhuma validação bloqueante — a precisão é informativa/de sinalização, nunca impede a operação.

**Mensagens exibidas**: "Sinal de GPS fraco no momento — a localização pode demorar a atualizar."

**Casos excepcionais**: ver `CASO-02` (Parte 7, GPS indisponível).

**Critérios de aceite**:

- **Dado** uma posição com baixa precisão reportada, **quando** processada, **então** é armazenada normalmente no histórico, mas sinalizada para fins de exibição/alerta.
- **Dado** uma sequência de posições geograficamente incoerente, **quando** detectada, **então** gera alerta ao Gestor sem interromper a viagem.

**Possíveis melhorias futuras**: fusão de sinal de GPS com dados de sensores do aparelho (acelerômetro) para suavizar a trajetória exibida em áreas de sinal instável (V3).

---

## EMB-01 — Checklist de Embarque

**Objetivo**: confirmar, de forma nominal e auditável, quais alunos embarcaram em cada parada.

**Usuários envolvidos**: Motorista, Monitor.

**Pré-requisitos**: viagem `em_andamento`, parada alcançada (detectada por geofencing, `GPS-03`).

**Fluxo principal**: ver Dossiê 11 §3.3 — lista de alunos esperados naquela parada, toque em "Embarcou" ou "Ausente" (com submotivo) por aluno, confirmação da parada libera o avanço da viagem e dispara notificação automática.

**Fluxos alternativos**: aluno com ausência avisada previamente (`STU-absence`) já aparece pré-marcado na lista, exigindo apenas confirmação visual, não uma nova decisão do motorista.

**Regras de negócio**: `RN-13` (alerta se aluno não processado em X minutos após o horário previsto); notificação ao responsável só é disparada após a confirmação explícita da parada inteira (não a cada toque individual), evitando notificações fragmentadas e permitindo correção de um toque errado antes de confirmar.

**Permissões**: Motorista e Monitor da viagem em curso.

**Validações**: todos os alunos daquela parada devem ser processados (embarcou ou ausente) antes de permitir "Confirmar e seguir".

**Mensagens exibidas**: "Parada confirmada. Avançando para o próximo ponto."; erro — "Ainda há alunos não processados nesta parada."

**Casos excepcionais**: ver `CASO-03` e `CASO-04` (Parte 7).

**Critérios de aceite**:

- **Dado** uma parada com 4 alunos esperados, **quando** o motorista marca todos e confirma, **então** notificações de embarque são disparadas a todos os responsáveis correspondentes simultaneamente.
- **Dado** um aluno com ausência avisada previamente, **quando** a parada é aberta, **então** ele já aparece marcado como "ausência avisada", exigindo apenas confirmação.

**Possíveis melhorias futuras**: ver `EMB-02`/`EMB-03`/`EMB-04`.

---

## EMB-02 — Embarque por QR Code (estrutura futura)

**Objetivo**: acelerar e reforçar a precisão do checklist através da leitura de um QR Code individual do aluno (crachá/cartão) no momento do embarque.

**Descrição**: funcionalidade de V2/V3 (estrutura preparada, não ativa no MVP) — cada aluno pode ter um QR Code único gerado pelo sistema (impresso em um crachá fornecido pela escola/transportador); o motorista/monitor escaneia no momento do embarque, e o sistema automaticamente marca "embarcou" para aquele aluno especificamente.

**Usuários envolvidos**: Motorista, Monitor.

**Pré-requisitos**: aluno com QR Code gerado e crachá físico distribuído.

**Fluxo principal**: motorista/monitor abre o scanner no app → aponta para o QR Code do aluno → sistema identifica o aluno e marca "embarcou" automaticamente, sem necessidade de buscar o nome na lista manualmente.

**Fluxos alternativos**: QR Code danificado/ilegível — fallback imediato para a lista manual (`EMB-05`), nunca bloqueando o embarque por falha de leitura.

**Regras de negócio**: a leitura do QR Code é uma **conveniência de entrada de dado**, não uma mudança na regra de negócio subjacente (`RN-13` continua se aplicando exatamente da mesma forma).

**Permissões**: idênticas a `EMB-01`.

**Validações**: QR Code deve corresponder a um aluno daquela parada específica — leitura de um QR Code de aluno de outra rota/parada é rejeitada com alerta.

**Mensagens exibidas**: "[Nome do aluno] embarcou."; erro — "Este QR Code não pertence a um aluno desta parada."

**Casos excepcionais**: crachá perdido/trocado entre alunos — o Gestor pode gerar um novo QR Code a qualquer momento, invalidando o anterior automaticamente.

**Critérios de aceite**:

- **Dado** um QR Code válido de um aluno da parada atual, **quando** escaneado, **então** o aluno é automaticamente marcado como embarcado.
- **Dado** um QR Code de um aluno que não pertence àquela parada, **quando** escaneado, **então** o sistema rejeita com mensagem de alerta.

**Possíveis melhorias futuras**: geração de crachá em PDF pronto para impressão diretamente do painel do Gestor.

---

## EMB-03 — Embarque por NFC (estrutura futura)

**Objetivo**: alternativa ao QR Code para ambientes onde a leitura por aproximação (NFC) seja mais prática que a leitura óptica (ex. baixa luminosidade).

**Descrição**: funcionalidade de V3, mesmo princípio funcional de `EMB-02`, trocando o mecanismo de leitura (aproximação de um cartão/pulseira NFC em vez de escaneamento de câmera).

**Usuários envolvidos**: Motorista, Monitor.

**Pré-requisitos**: aluno com credencial NFC emitida; dispositivo do motorista/monitor com leitor NFC compatível.

**Fluxo principal**: análogo a `EMB-02`, substituindo escaneamento por aproximação do cartão/pulseira.

**Fluxos alternativos/Regras de negócio/Permissões/Validações/Mensagens/Casos excepcionais**: idênticos a `EMB-02`, mudando apenas o mecanismo de captura.

**Critérios de aceite**: análogos a `EMB-02`.

**Possíveis melhorias futuras**: avaliação de custo-benefício da emissão de credenciais físicas NFC vs. QR Code impresso (mais barato) antes de priorizar esta funcionalidade no roadmap.

---

## EMB-04 — Embarque por Reconhecimento Facial do Aluno (estrutura futura)

**Objetivo**: automatizar a confirmação de embarque via reconhecimento facial da criança, eliminando completamente a necessidade de toque manual do motorista/monitor.

**Descrição**: funcionalidade de V3, de maior complexidade e sensibilidade (dado biométrico de menor de idade) — exige base legal reforçada e consentimento explícito e específico do responsável legal, distinto do consentimento geral de uso do app.

**Usuários envolvidos**: Motorista/Monitor (supervisão passiva), Responsável (consentimento).

**Pré-requisitos**: consentimento específico do responsável legal para tratamento biométrico do menor; enrolamento facial do aluno previamente realizado (com o mesmo cuidado de minimização de dado de `DRV-04`).

**Fluxo principal**: câmera do dispositivo do motorista/monitor, posicionada na entrada do veículo, identifica o rosto da criança ao embarcar e marca automaticamente o embarque, com o motorista/monitor apenas supervisionando e podendo corrigir manualmente em caso de erro.

**Fluxos alternativos**: falha de reconhecimento (criança com o rosto parcialmente coberto, ex. capuz) — fallback imediato para confirmação manual (`EMB-01`), nunca bloqueando o embarque.

**Regras de negócio**: dado biométrico da criança segue a mesma regra de proteção máxima de `RN-33` (Dossiê 8) — nunca exposto a qualquer papel humano, apenas o resultado da correspondência é utilizado.

**Permissões**: idênticas a `EMB-01`, com a camada adicional de consentimento do responsável como pré-requisito de habilitação por aluno.

**Validações**: consentimento específico registrado e vigente antes de qualquer captura biométrica da criança.

**Mensagens exibidas**: ao responsável, no momento do consentimento — "Isso permitirá que o embarque do seu filho seja confirmado automaticamente por reconhecimento facial. Seus dados são protegidos e nunca compartilhados."

**Casos excepcionais**: revogação do consentimento pelo responsável a qualquer momento — desativa imediatamente o reconhecimento facial para aquele aluno específico, sem afetar os demais alunos da mesma rota.

**Critérios de aceite**:

- **Dado** um aluno com consentimento e enrolamento facial válidos, **quando** ele embarca e é reconhecido, **então** o embarque é confirmado automaticamente, com o motorista podendo ver e corrigir se necessário.
- **Dado** um responsável que revoga o consentimento, **quando** isso ocorre, **então** o reconhecimento facial é desativado para aquele aluno imediatamente, sem impactar os demais.

**Possíveis melhorias futuras**: avaliação jurídica aprofundada (parecer de privacidade dedicado) antes de qualquer lançamento, dado o nível de sensibilidade do dado envolvido — este item é o de maior exigência de rigor de compliance de toda a especificação.

---

## EMB-05 — Embarque por Lista Manual

**Objetivo**: garantir que o checklist funcione de forma robusta e independente de qualquer tecnologia adicional (QR/NFC/facial), como o método padrão e universal.

**Descrição**: é, na prática, a mesma funcionalidade de `EMB-01` — esta entrada existe para deixar explícito que a lista manual **nunca é substituída** pelas alternativas tecnológicas (`EMB-02`/`03`/`04`), apenas complementada por elas. Todo tenant opera com lista manual disponível por padrão, independentemente de adotar ou não as tecnologias futuras.

**Usuários envolvidos, Pré-requisitos, Fluxo principal, Regras de negócio, Permissões, Validações, Mensagens, Casos excepcionais, Critérios de aceite**: idênticos a `EMB-01`.

**Possíveis melhorias futuras**: nenhuma — esta é, deliberadamente, a funcionalidade mais simples e estável de toda a especificação, o piso de confiabilidade sobre o qual as demais são construídas.

---

## DESEMB-01 — Confirmação de Desembarque

**Objetivo**: confirmar, de forma nominal e auditável, quais alunos desembarcaram em cada parada.

**Descrição**: espelha `EMB-01`, com a diferença de contexto (fim de trajeto de um aluno específico, não início).

**Usuários envolvidos**: Motorista, Monitor.

**Pré-requisitos**: aluno previamente embarcado na mesma viagem.

**Fluxo principal**: idêntico a `EMB-01`, com a ação "Desembarcou" em vez de "Embarcou", na parada de desembarque específica daquele aluno (que pode ser diferente da parada de embarque, `STU-06`).

**Fluxos alternativos**: nenhum além dos já cobertos em `EMB-01`.

**Regras de negócio**: um aluno só pode ser marcado como desembarcado se estiver marcado como embarcado naquela mesma viagem (consistência de estado — não é possível "desembarcar" alguém que nunca embarcou).

**Permissões**: idênticas a `EMB-01`.

**Validações**: idem.

**Mensagens exibidas**: idênticas a `EMB-01`, adaptadas ao contexto.

**Casos excepcionais**: nenhum além dos já cobertos.

**Critérios de aceite**:

- **Dado** um aluno embarcado nesta viagem, **quando** o motorista confirma seu desembarque na parada correta, **então** o evento é registrado e a notificação é disparada (`DESEMB-03`).

**Possíveis melhorias futuras**: nenhuma além das já cobertas em `EMB-*`.

---

## DESEMB-02 — Histórico de Desembarque

**Objetivo**: consolidar, junto ao histórico geral de viagem (`STU-08`/`TRIP-timeline`), o registro específico de horário e local de desembarque de cada aluno.

**Descrição**: não é uma tela isolada — é parte da visão de histórico já coberta em `STU-08` (Parte 3). Esta entrada formaliza que o dado de desembarque é sempre parte do mesmo registro imutável de `Evento` (Dossiê 8 §12), nunca uma tabela paralela sujeita a divergência.

**Usuários envolvidos, Permissões**: idênticos a `STU-08`.

**Critérios de aceite**: ver `STU-08`.

**Possíveis melhorias futuras**: nenhuma além das já cobertas.

---

## DESEMB-03 — Notificações de Desembarque

**Objetivo**: garantir que o responsável seja informado imediatamente após a confirmação do desembarque do seu filho.

**Usuários envolvidos**: Responsável (destinatário).

**Pré-requisitos**: desembarque confirmado (`DESEMB-01`).

**Fluxo principal**: evento `aluno.desembarcou` publicado → módulo de Notificações resolve destinatários/canais → envio multicanal conforme preferência (`NOTIF-*`, Parte 5).

**Fluxos alternativos**: nenhum além do já coberto no subsistema de notificações.

**Regras de negócio**: notificação disparada apenas após confirmação explícita do motorista/monitor (nunca antecipada por proximidade geográfica apenas).

**Permissões**: idênticas ao subsistema de notificações.

**Validações**: nenhuma além das já cobertas em `NOTIF-*`.

**Mensagens exibidas**: "[Nome do aluno] chegou em casa às [horário]." (ou à escola, conforme o sentido da viagem).

**Casos excepcionais**: nenhum além dos já cobertos em `NOTIF-*`.

**Critérios de aceite**:

- **Dado** um desembarque confirmado, **quando** o evento é processado, **então** o responsável recebe a notificação em até 10 segundos (SLO de referência, Dossiê 4 §20.4).

**Possíveis melhorias futuras**: nenhuma além das já cobertas em `NOTIF-*`.
