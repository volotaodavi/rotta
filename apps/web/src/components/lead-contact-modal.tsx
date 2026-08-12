"use client";

import { Mail } from "@rotta/icons";
import { Button, FormField, Input, Modal, Select, Typography } from "@rotta/ui/web";
import { useMemo, useState, type FormEvent } from "react";

/** Uma opção de tipo de órgão no modal do /governo, com as soluções da Rotta mais relevantes pra ela. */
export interface AudienceOption {
  value: string;
  label: string;
  solutions: string[];
}

export interface LeadContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pra onde o `mailto:` final é montado. */
  toEmail: string;
  /**
   * `"governo"` mostra os campos extras (tipo de órgão + soluções, dia
   * preferido, tamanho estimado da frota) pedidos pro formulário de
   * `/governo`; `"geral"` é a versão enxuta usada em `/contato` — texto
   * de cabeçalho e placeholders mudam de acordo (harmonização pedida
   * pelo usuário: mesmo componente, dois tons de voz).
   */
  variant: "governo" | "geral";
  audienceOptions?: AudienceOption[];
  defaultSubject: string;
  title: string;
  description: string;
}

const CAMPO_OBRIGATORIO = "Campo obrigatório.";

/**
 * Substitui os antigos links `mailto:` estáticos (que exigiam o
 * visitante já ter um cliente de e-mail configurado no navegador — sem
 * isso, "nada abre" e o botão parece quebrado) por um formulário real
 * que monta um `mailto:` PERSONALIZADO com o que a pessoa realmente
 * preencheu, em vez de um corpo de e-mail genérico que ela teria que
 * editar à mão. Continua sem backend novo (mesma disciplina documentada
 * em `/governo`: nenhum lead fica retido num banco que ninguém olha) —
 * só troca "e-mail em branco" por "e-mail pronto para enviar".
 */
export function LeadContactModal({
  isOpen,
  onClose,
  toEmail,
  variant,
  audienceOptions,
  defaultSubject,
  title,
  description,
}: LeadContactModalProps): JSX.Element {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [orgao, setOrgao] = useState("");
  const [tipoOrgao, setTipoOrgao] = useState(audienceOptions?.[0]?.value ?? "");
  const [emailContato, setEmailContato] = useState("");
  const [assunto, setAssunto] = useState(defaultSubject);
  const [mensagem, setMensagem] = useState("");
  const [diaPreferido, setDiaPreferido] = useState("");
  const [qtdAlunos, setQtdAlunos] = useState("");
  const [qtdMotoristas, setQtdMotoristas] = useState("");
  const [qtdGestores, setQtdGestores] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const audienciaSelecionada = useMemo(
    () => audienceOptions?.find((option) => option.value === tipoOrgao),
    [audienceOptions, tipoOrgao],
  );

  function handleClose(): void {
    setErro(null);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!nome.trim() || !mensagem.trim()) {
      setErro(CAMPO_OBRIGATORIO);
      return;
    }
    setErro(null);

    const linhas: string[] = [`Olá, equipe Rotta!`, ``, `Meu nome é ${nome.trim()}.`];
    if (cargo.trim()) linhas.push(`Cargo: ${cargo.trim()}`);
    if (variant === "governo" && orgao.trim()) linhas.push(`Órgão: ${orgao.trim()}`);
    if (variant === "governo" && audienciaSelecionada) {
      linhas.push(`Tipo de órgão: ${audienciaSelecionada.label}`);
    }
    if (emailContato.trim()) linhas.push(`Melhor e-mail para retorno: ${emailContato.trim()}`);
    linhas.push(``, `Escopo/mensagem:`, mensagem.trim());
    if (variant === "governo" && diaPreferido) {
      linhas.push(``, `Dia mais adequado para uma conversa: ${diaPreferido}`);
    }
    if (variant === "governo" && (qtdAlunos || qtdMotoristas || qtdGestores)) {
      linhas.push(``, `Tamanho estimado:`);
      if (qtdAlunos) linhas.push(`- Alunos: ${qtdAlunos}`);
      if (qtdMotoristas) linhas.push(`- Motoristas: ${qtdMotoristas}`);
      if (qtdGestores) linhas.push(`- Gestores/usuários do painel: ${qtdGestores}`);
    }
    linhas.push(``, `Aguardo retorno!`);

    const corpo = linhas.filter((linha): linha is string => linha !== null).join("\n");
    const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(assunto || defaultSubject)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = mailto;
    handleClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel={title}>
      <Modal.Header onClose={handleClose}>{title}</Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            {description}
          </Typography>

          <FormField label="Seu nome" isRequired>
            <Input value={nome} onChange={(event) => setNome(event.target.value)} required />
          </FormField>

          <FormField label="Cargo">
            <Input
              value={cargo}
              onChange={(event) => setCargo(event.target.value)}
              placeholder={
                variant === "governo" ? "ex.: Secretário de Educação" : "ex.: Gestor de frota"
              }
            />
          </FormField>

          {variant === "governo" && (
            <FormField label="Órgão / instituição" isRequired>
              <Input
                value={orgao}
                onChange={(event) => setOrgao(event.target.value)}
                placeholder="ex.: Secretaria Municipal de Educação de [cidade/UF]"
                required
              />
            </FormField>
          )}

          {variant === "governo" && audienceOptions && audienceOptions.length > 0 && (
            <FormField label="Tipo de órgão">
              <Select value={tipoOrgao} onChange={(event) => setTipoOrgao(event.target.value)}>
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {audienciaSelecionada && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <Typography variant="caption" color="muted" className="font-semibold">
                O que a Rotta oferece para {audienciaSelecionada.label.toLowerCase()}:
              </Typography>
              <ul className="mt-2 flex flex-col gap-1.5">
                {audienciaSelecionada.solutions.map((solucao) => (
                  <li key={solucao} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {solucao}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FormField label="Seu e-mail para retorno">
            <Input
              type="email"
              value={emailContato}
              onChange={(event) => setEmailContato(event.target.value)}
              placeholder="opcional — útil se enviar de um dispositivo com outro e-mail"
            />
          </FormField>

          <FormField label="Assunto" isRequired>
            <Input value={assunto} onChange={(event) => setAssunto(event.target.value)} required />
          </FormField>

          <FormField label={variant === "governo" ? "Escopo do e-mail" : "Mensagem"} isRequired>
            <textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              placeholder={
                variant === "governo"
                  ? "O que você gostaria de discutir na reunião? Contexto do município, prazo, etc."
                  : "Como podemos ajudar?"
              }
              rows={4}
              required
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </FormField>

          {variant === "governo" && (
            <>
              <FormField label="Dia mais adequado para conversar">
                <Input
                  type="date"
                  value={diaPreferido}
                  onChange={(event) => setDiaPreferido(event.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Alunos (aprox.)">
                  <Input
                    type="number"
                    min={0}
                    value={qtdAlunos}
                    onChange={(event) => setQtdAlunos(event.target.value)}
                  />
                </FormField>
                <FormField label="Motoristas (aprox.)">
                  <Input
                    type="number"
                    min={0}
                    value={qtdMotoristas}
                    onChange={(event) => setQtdMotoristas(event.target.value)}
                  />
                </FormField>
                <FormField label="Gestores (aprox.)">
                  <Input
                    type="number"
                    min={0}
                    value={qtdGestores}
                    onChange={(event) => setQtdGestores(event.target.value)}
                  />
                </FormField>
              </div>
            </>
          )}

          {erro && (
            <Typography variant="bodySmall" color="danger">
              {erro}
            </Typography>
          )}
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" iconLeft={<Mail className="h-4 w-4" />}>
            Abrir e-mail pronto para enviar
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
