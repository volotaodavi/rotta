"use client";

import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Modal,
  Select,
  Table,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { ContratoParaCobrar, CriarAssinaturaDaFamiliaInput } from "@rotta/api-client";

export type LigarCobrancaMensal = (entrada: {
  contractId: string;
  input: CriarAssinaturaDaFamiliaInput;
}) => Promise<unknown>;

const MEIOS: Array<{ value: "PIX" | "BOLETO" | "UNDEFINED"; label: string }> = [
  { value: "PIX", label: "Pix" },
  { value: "BOLETO", label: "Boleto" },
  { value: "UNDEFINED", label: "A família escolhe" },
];

/** Dígitos de um CPF, para conferir o tamanho antes de mandar. */
function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export interface FormularioDeCobrancaMensalProps {
  contrato: ContratoParaCobrar;
  isLigando: boolean;
  onConfirmar: LigarCobrancaMensal;
  onCancelar: () => void;
}

/**
 * O formulário que liga a cobrança mensal de um contrato.
 *
 * ## Por que é um componente próprio, e não o corpo do modal
 *
 * Para poder ser testado. O `Modal.Header` do design system usa ícone de
 * `@rotta/icons`, que o Vitest carrega por resolução do Node — sem
 * passar pelos alias do `vitest.config.ts` — e portanto com a cópia
 * React 18 do pacote, o que o `react-dom` 19 deste app recusa com "A
 * React Element from an older version of React was rendered". É limite
 * do runner, não do componente, e já está documentado em
 * `modal-mantem-o-foco.spec.tsx`.
 *
 * Separando, a regra que importa (validar o CPF, montar o payload,
 * mostrar a recusa) fica coberta por teste, e o modal continua sendo só
 * a moldura — que o design system já testa por conta própria.
 *
 * ## Por que o erro aparece aqui, e não em aviso que passa
 *
 * Ligar cobrança é operação de dinheiro, e a recusa quase sempre diz o
 * que corrigir ("falta o CPF", "a mensalidade está em R$ 0,00"). Essa
 * frase precisa ficar na tela ao lado do campo, não desaparecer em três
 * segundos.
 */
export function FormularioDeCobrancaMensal({
  contrato,
  isLigando,
  onConfirmar,
  onCancelar,
}: FormularioDeCobrancaMensalProps): JSX.Element {
  const [cpf, setCpf] = useState("");
  const [meio, setMeio] = useState<"PIX" | "BOLETO" | "UNDEFINED">("PIX");
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar(): Promise<void> {
    const digitos = somenteDigitos(cpf);
    if (contrato.precisaDeCpf && digitos.length !== 11) {
      setErro("Informe os 11 dígitos do CPF de quem paga.");
      return;
    }

    setErro(null);
    try {
      await onConfirmar({
        contractId: contrato.contractId,
        input: {
          meioDePagamento: meio,
          ...(contrato.precisaDeCpf ? { cpfDoResponsavel: digitos } : {}),
        },
      });
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível ligar a cobrança mensal. Tente de novo.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="bodySmall" color="muted">
        {contrato.responsavelNome} passa a receber a mensalidade de {contrato.alunoNome} todo mês,
        no valor de {contrato.valorFormatado}, com link para pagar.
        {contrato.vigenciaFim
          ? " A cobrança para junto com a vigência do contrato."
          : " O contrato não tem fim de vigência combinado, então a cobrança segue até ser desligada."}
      </Typography>

      {contrato.precisaDeCpf ? (
        <FormField
          label="CPF de quem paga"
          errorText={erro ?? undefined}
          helperText="A Rotta não pede CPF de responsável no cadastro, e o provedor de pagamento exige o documento de quem paga. Fica guardado para as próximas vezes."
          isRequired
        >
          <Input
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            placeholder="000.000.000-00"
            inputMode="numeric"
            hasError={Boolean(erro)}
          />
        </FormField>
      ) : null}

      <FormField label="Como a família paga">
        <Select value={meio} onChange={(event) => setMeio(event.target.value as typeof meio)}>
          {MEIOS.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </Select>
      </FormField>

      {erro && !contrato.precisaDeCpf ? (
        <Typography variant="bodySmall" color="danger">
          {erro}
        </Typography>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button onClick={() => void confirmar()} isLoading={isLigando}>
          Ligar cobrança
        </Button>
      </div>
    </div>
  );
}

export interface CobrancaMensalCardProps {
  contratos: ContratoParaCobrar[] | undefined;
  isLoading: boolean;
  isLigando: boolean;
  onLigarCobranca: LigarCobrancaMensal;
}

/**
 * A cobrança mensal automática das famílias.
 *
 * ## O que esta tela resolve
 *
 * Hoje a cobrança só existe quando a família abre o app e toca em
 * "pagar". Com a cobrança mensal ligada, o provedor gera a cobrança de
 * cada mês sozinho e a família recebe o link — **sem precisar de conta
 * em lugar nenhum**. Quem precisa de conta é só a transportadora.
 *
 * ## Por que o formulário tem tão pouco campo
 *
 * O contrato já diz quem é o aluno, quem paga, quanto é a mensalidade e
 * até quando vale a vigência. A tela só pede o que a Rotta não tem: o
 * CPF de quem paga, e só nas famílias em que ele falta.
 */
export function CobrancaMensalCard({
  contratos,
  isLoading,
  isLigando,
  onLigarCobranca,
}: CobrancaMensalCardProps): JSX.Element {
  const [emFoco, setEmFoco] = useState<ContratoParaCobrar | null>(null);

  const ativos = contratos?.filter((contrato) => contrato.cobrancaMensalAtiva).length ?? 0;

  return (
    <>
      <Card>
        <Card.Header
          title="Cobrança mensal automática"
          action={
            contratos && contratos.length > 0 ? (
              <Typography variant="bodySmall" color="muted">
                {ativos} de {contratos.length} ligadas
              </Typography>
            ) : undefined
          }
        />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            Com a cobrança ligada, a mensalidade de cada mês é emitida sozinha e a família recebe o
            link para pagar. Ela não precisa criar conta em lugar nenhum.
          </Typography>

          <Table
            columns={[
              { key: "aluno", header: "Aluno", render: (linha) => linha.alunoNome },
              {
                key: "responsavel",
                header: "Quem paga",
                render: (linha) => (
                  <div className="flex flex-col">
                    <span>{linha.responsavelNome}</span>
                    <span className="text-xs text-text-muted">{linha.responsavelTelefone}</span>
                  </div>
                ),
              },
              { key: "valor", header: "Mensalidade", render: (linha) => linha.valorFormatado },
              {
                key: "estado",
                header: "Cobrança mensal",
                render: (linha) =>
                  linha.cobrancaMensalAtiva ? (
                    <Badge variant="success">Ligada</Badge>
                  ) : (
                    <Badge variant="neutral">Desligada</Badge>
                  ),
              },
              {
                key: "acao",
                header: "",
                render: (linha) => {
                  if (linha.cobrancaMensalAtiva) {
                    return (
                      <Typography variant="bodySmall" color="muted">
                        —
                      </Typography>
                    );
                  }
                  if (linha.impedimento) {
                    return (
                      <Typography variant="bodySmall" color="muted">
                        {linha.impedimento}
                      </Typography>
                    );
                  }
                  return (
                    <Button size="sm" variant="secondary" onClick={() => setEmFoco(linha)}>
                      Ligar
                    </Button>
                  );
                },
              },
            ]}
            rows={contratos ?? []}
            keyExtractor={(linha) => linha.contractId}
            emptyMessage={
              isLoading
                ? "Carregando…"
                : "Nenhum contrato ativo ainda. A cobrança mensal sai dos contratos das famílias."
            }
          />
        </Card.Body>
      </Card>

      {emFoco ? (
        <Modal isOpen onClose={() => setEmFoco(null)} ariaLabel="Ligar a cobrança mensal">
          <Modal.Header onClose={() => setEmFoco(null)}>Ligar a cobrança mensal</Modal.Header>
          <Modal.Body>
            <FormularioDeCobrancaMensal
              contrato={emFoco}
              isLigando={isLigando}
              onCancelar={() => setEmFoco(null)}
              onConfirmar={async (entrada) => {
                const assinatura = await onLigarCobranca(entrada);
                setEmFoco(null);
                return assinatura;
              }}
            />
          </Modal.Body>
        </Modal>
      ) : null}
    </>
  );
}
