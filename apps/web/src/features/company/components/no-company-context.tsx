"use client";

import { setStoredCompanyId } from "@rotta/auth";
import { Button, Card, FormField, Input, Typography } from "@rotta/ui/web";
import { useState } from "react";

/**
 * Tela exibida quando ainda não há uma empresa corrente resolvida.
 * TEMPORÁRIA (ver `@rotta/auth/company-context-storage`): quando o Auth
 * real existir, a empresa corrente vem do vínculo ativo da sessão e esta
 * tela deixa de existir — nenhum usuário real digitaria um ID aqui.
 */
export function NoCompanyContext(): JSX.Element {
  const [value, setValue] = useState("");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <Card.Header title="Selecionar empresa (modo de teste)" />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            O módulo Auth ainda não existe — informe manualmente o ID da empresa (Company) para
            testar esta tela contra a API real.
          </Typography>
          <FormField label="ID da empresa">
            <Input value={value} onChange={(event) => setValue(event.target.value)} />
          </FormField>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isDisabled={!value}
            onClick={() => {
              setStoredCompanyId(value);
              window.location.reload();
            }}
          >
            Continuar
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
