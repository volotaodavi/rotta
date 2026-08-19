"use client";

import { ApiError } from "@rotta/api-client";
import { Check, Search } from "@rotta/icons";
import { Button, Card, FormField, Input, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { StudentPreRegistrationLookupResult } from "@rotta/api-client";

import {
  useClaimStudentPreRegistration,
  useLookupStudentPreRegistration,
} from "@/features/students/hooks/use-student-pre-registrations";

/**
 * "Código único do transporte" (pedido do usuário: "o responsável ao
 * entrar no app/web deverá colocar o código único do transporte, após
 * isso pedirá o número de celular e automaticamente irá buscar o aluno
 * respectivo + responsável, com a opção de clicar em 'continuar' e
 * 'corrigir' — deverá ter dois caminhos diferentes"). Dois caminhos
 * reais a partir daqui:
 *
 * - "Continuar": reivindica o pré-cadastro encontrado
 *   (`StudentPreRegistrationsService.claim`) e segue pra `/alunos/novo`
 *   já com o nome do aluno preenchido.
 * - "Corrigir" (a busca não encontrou nada, ou encontrou o aluno
 *   errado): segue pra `/alunos/novo` em branco, sem consumir nenhum
 *   pré-cadastro — o cadastro completo continua funcionando do zero,
 *   exatamente como antes desta funcionalidade existir.
 */
export default function VincularTransportePage(): JSX.Element {
  const router = useRouter();
  const lookup = useLookupStudentPreRegistration();
  const claim = useClaimStudentPreRegistration();

  const [codigoInterno, setCodigoInterno] = useState("");
  const [celular, setCelular] = useState("");
  const [resultado, setResultado] = useState<StudentPreRegistrationLookupResult | null>(null);
  const [buscou, setBuscou] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBuscar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const encontrado = await lookup.mutateAsync({
        codigoInterno: codigoInterno.trim().toUpperCase(),
        celular,
      });
      setResultado(encontrado);
      setBuscou(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao buscar. Tente novamente.",
      );
    }
  }

  async function handleContinuar(): Promise<void> {
    if (!resultado) return;
    setErrorMessage(null);
    try {
      await claim.mutateAsync(resultado.id);
      router.push(
        `/alunos/novo?preRegistrationId=${encodeURIComponent(resultado.id)}&nomeAluno=${encodeURIComponent(resultado.nomeAluno)}`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível continuar agora. Tente de novo.",
      );
    }
  }

  function handleCorrigir(): void {
    router.push("/alunos/novo");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Código do transporte</Typography>
        <Typography variant="bodySmall" color="muted">
          A transportadora já pode ter pré-cadastrado o transporte do seu filho. Informe o código
          dela e o seu celular pra gente encontrar automaticamente.
        </Typography>
      </div>

      {!buscou ? (
        <Card>
          <form onSubmit={(event) => void handleBuscar(event)}>
            <Card.Body className="flex flex-col gap-4">
              <FormField label="Código da transportadora" isRequired>
                <Input
                  required
                  placeholder="ex: TRN-000001"
                  autoCapitalize="characters"
                  value={codigoInterno}
                  onChange={(event) => setCodigoInterno(event.target.value.toUpperCase())}
                />
              </FormField>
              <FormField label="Seu celular" isRequired>
                <Input
                  required
                  placeholder="(11) 98888-7777"
                  value={celular}
                  onChange={(event) => setCelular(event.target.value)}
                />
              </FormField>
              {errorMessage ? (
                <Typography variant="bodySmall" color="danger">
                  {errorMessage}
                </Typography>
              ) : null}
            </Card.Body>
            <Card.Footer>
              <Button
                type="submit"
                variant="primary"
                iconLeft={<Search className="h-4 w-4" />}
                isLoading={lookup.isPending}
              >
                Buscar
              </Button>
            </Card.Footer>
          </form>
        </Card>
      ) : resultado ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-success" />
            <Typography variant="subtitle">Encontramos um cadastro!</Typography>
            <Typography variant="body">
              Aluno: <strong>{resultado.nomeAluno}</strong>
              <br />
              Responsável: {resultado.nomeResponsavel}
              <br />
              Transportadora: {resultado.companyName}
            </Typography>
            {errorMessage ? (
              <Typography variant="bodySmall" color="danger">
                {errorMessage}
              </Typography>
            ) : null}
          </Card.Body>
          <Card.Footer className="flex justify-center gap-3">
            <Button variant="secondary" onClick={handleCorrigir}>
              Não é isso, corrigir
            </Button>
            <Button isLoading={claim.isPending} onClick={() => void handleContinuar()}>
              Continuar
            </Button>
          </Card.Footer>
        </Card>
      ) : (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-8 text-center">
            <Typography variant="body" color="muted">
              Não encontramos nenhum pré-cadastro com esse código e celular. Sem problema: você pode
              cadastrar o aluno do zero agora mesmo.
            </Typography>
          </Card.Body>
          <Card.Footer className="flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setBuscou(false);
                setResultado(null);
              }}
            >
              Tentar outro código
            </Button>
            <Button onClick={handleCorrigir}>Cadastrar do zero</Button>
          </Card.Footer>
        </Card>
      )}
    </div>
  );
}
