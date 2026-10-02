"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Input, Modal, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { ItemDeExclusao } from "@rotta/api-client";

function Lista({ itens }: { itens: ItemDeExclusao[] }): JSX.Element {
  if (itens.length === 0) {
    return (
      <Typography variant="bodySmall" color="muted">
        Nenhum registro vinculado.
      </Typography>
    );
  }
  return (
    <ul className="list-inside list-disc">
      {itens.map((item) => (
        <li key={item.o_que}>
          <Typography variant="bodySmall" color="muted">
            {item.quantos} {item.o_que}
          </Typography>
        </li>
      ))}
    </ul>
  );
}

export interface ExcluirDefinitivamenteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** O que o admin digita para liberar o botão: nome fantasia ou e-mail. */
  confirmacaoEsperada: string;
  titulo: string;
  /** Troca o parágrafo de alerta quando o que está sendo apagado não é uma conta. */
  aviso?: string;
  isLoadingPreview: boolean;
  /** `null` enquanto o preview não chegou. */
  podeExcluir: boolean | null;
  impedimentos: ItemDeExclusao[];
  seraApagado: ItemDeExclusao[];
  /** Contas que caem junto (só na exclusão de transportadora). */
  contasQueSeraoApagadas?: Array<{ userId: string; nome: string; email: string }>;
  contasQueSobrevivem?: Array<{ userId: string; nome: string; email: string }>;
  isExcluindo: boolean;
  erro: unknown;
  onConfirmar: () => void;
}

/**
 * Confirmação de exclusão DEFINITIVA (pedido do usuário, 02/10/2026).
 *
 * Três decisões de tela, todas por causa de a operação não ter volta:
 *
 * 1. O preview do backend é mostrado inteiro antes de qualquer botão —
 *    quantos alunos, veículos, viagens e contas vão embora.
 * 2. O botão só habilita depois de o admin DIGITAR o nome (ou e-mail) do
 *    que está apagando. "Tem certeza? [Sim]" é um clique de distância de
 *    um acidente; digitar o nome não é.
 * 3. Quando o backend recusa (`podeExcluir: false`), a tela mostra o que
 *    impede em vez de um erro genérico, porque a saída existe: excluir a
 *    transportadora inteira.
 */
export function ExcluirDefinitivamenteDialog({
  isOpen,
  onClose,
  confirmacaoEsperada,
  titulo,
  aviso,
  isLoadingPreview,
  podeExcluir,
  impedimentos,
  seraApagado,
  contasQueSeraoApagadas,
  contasQueSobrevivem,
  isExcluindo,
  erro,
  onConfirmar,
}: ExcluirDefinitivamenteDialogProps): JSX.Element {
  const [confirmacao, setConfirmacao] = useState("");

  function fechar(): void {
    setConfirmacao("");
    onClose();
  }

  const confirmado = confirmacao.trim().toLowerCase() === confirmacaoEsperada.trim().toLowerCase();

  return (
    <Modal isOpen={isOpen} onClose={fechar}>
      <Modal.Header onClose={fechar}>{titulo}</Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {isLoadingPreview ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            <Typography variant="bodySmall" color="danger">
              {aviso ??
                "Isto apaga os dados do banco e não tem como desfazer. E-mail, telefone, CPF e CNPJ voltam a ficar livres para um novo cadastro. Os pagamentos já recebidos ficam registrados, só sem os dados pessoais."}
            </Typography>

            {podeExcluir === false ? (
              <div className="flex flex-col gap-1">
                <Typography variant="bodySmall">Não é possível excluir agora porque há:</Typography>
                <Lista itens={impedimentos} />
                <Typography variant="caption" color="muted">
                  Esses registros pertencem a uma transportadora que continua existindo. Para apagar
                  tudo, exclua a transportadora.
                </Typography>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <Typography variant="bodySmall">Será apagado:</Typography>
                  <Lista itens={seraApagado} />
                </div>

                {contasQueSeraoApagadas && contasQueSeraoApagadas.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <Typography variant="bodySmall">Contas que serão apagadas:</Typography>
                    <Lista
                      itens={contasQueSeraoApagadas.map((conta) => ({
                        o_que: `${conta.nome} (${conta.email})`,
                        quantos: 1,
                      }))}
                    />
                  </div>
                ) : null}

                {contasQueSobrevivem && contasQueSobrevivem.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <Typography variant="bodySmall">
                      Contas que continuam (têm vínculo em outra empresa):
                    </Typography>
                    <Lista
                      itens={contasQueSobrevivem.map((conta) => ({
                        o_que: `${conta.nome} (${conta.email})`,
                        quantos: 1,
                      }))}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Typography variant="bodySmall">
                    Para confirmar, digite <strong>{confirmacaoEsperada}</strong>:
                  </Typography>
                  <Input
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                    placeholder={confirmacaoEsperada}
                  />
                </div>
              </>
            )}

            {erro ? (
              <Typography variant="bodySmall" color="danger">
                {erro instanceof ApiError ? erro.message : "Não foi possível excluir agora."}
              </Typography>
            ) : null}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={fechar}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={!confirmado || podeExcluir === false || isLoadingPreview}
          isLoading={isExcluindo}
          onClick={onConfirmar}
        >
          Excluir definitivamente
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
