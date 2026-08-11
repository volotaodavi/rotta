"use client";

import { Send } from "@rotta/icons";
import { Button, FormField, Input } from "@rotta/ui/web";
import { useState, type FormEvent } from "react";

import { GOVERNO_CONTACT_EMAIL } from "@/lib/site-config";

/**
 * Formulário de contato do funil `/governo` — pedido explícito do
 * usuário: "colocando um botão direcionando para um formulário próprio
 * da Rotta ou e-mail (rottadobrasil@gmail.com), para enviar a resposta
 * deles". Em vez de criar um endpoint/tabela nova no backend (fora do
 * escopo pedido — "Apenas faça isso" — e o mesmo tipo de infraestrutura
 * nova que já foi recusada nesta sessão por não caber na arquitetura
 * real), este formulário só monta um `mailto:` client-side com os dados
 * preenchidos: nenhuma chamada de rede, nenhum dado passa pelo
 * navegador do usuário além de abrir o cliente de e-mail dele.
 */
export function GovernoContactForm(): JSX.Element {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [orgao, setOrgao] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [frota, setFrota] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const assunto = `Contato institucional — ${orgao || "órgão público"}${municipio ? ` (${municipio})` : ""}`;
    const linhas = [
      `Nome: ${nome}`,
      cargo && `Cargo/função: ${cargo}`,
      `Órgão/Secretaria: ${orgao}`,
      municipio && `Município/UF: ${municipio}`,
      `E-mail institucional: ${email}`,
      telefone && `Telefone/WhatsApp: ${telefone}`,
      frota && `Tamanho aproximado da frota: ${frota}`,
      "",
      mensagem ||
        "Gostaria de conhecer a Rotta para o transporte escolar público do nosso município.",
    ].filter(Boolean);

    const mailto = `mailto:${GOVERNO_CONTACT_EMAIL}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(linhas.join("\n"))}`;
    window.location.href = mailto;
    setEnviado(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nome completo" isRequired>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </FormField>
        <FormField label="Cargo / função">
          <Input
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex.: Secretário(a) de Educação"
          />
        </FormField>
        <FormField label="Órgão / Secretaria" isRequired>
          <Input
            value={orgao}
            onChange={(e) => setOrgao(e.target.value)}
            placeholder="Ex.: Secretaria Municipal de Educação"
            required
          />
        </FormField>
        <FormField label="Município / UF">
          <Input
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Ex.: Maricá/RJ"
          />
        </FormField>
        <FormField label="E-mail institucional" isRequired>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@prefeitura.gov.br"
            required
          />
        </FormField>
        <FormField label="Telefone / WhatsApp">
          <Input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField
            label="Tamanho aproximado da frota"
            helperText="Se souber — não é obrigatório."
          >
            <Input
              value={frota}
              onChange={(e) => setFrota(e.target.value)}
              placeholder="Ex.: 40 veículos, 12 rotas"
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Mensagem" helperText="Opcional">
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              placeholder="Conte um pouco sobre a demanda do seu município ou órgão."
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-colors duration-150 placeholder:text-placeholder focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </FormField>
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" iconRight={<Send className="h-4 w-4" />}>
        Enviar para a Rotta
      </Button>

      {enviado && (
        <p className="text-sm text-text-muted">
          Seu cliente de e-mail deve abrir com a mensagem pronta para {GOVERNO_CONTACT_EMAIL}. Se
          nada abrir, escreva diretamente para{" "}
          <a href={`mailto:${GOVERNO_CONTACT_EMAIL}`} className="font-semibold text-primary">
            {GOVERNO_CONTACT_EMAIL}
          </a>
          .
        </p>
      )}
    </form>
  );
}
