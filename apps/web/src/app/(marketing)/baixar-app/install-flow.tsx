"use client";

import { AlertTriangle, ArrowLeft, Download, ShieldCheck, Smartphone } from "@rotta/icons";
import { buttonVariants, Typography } from "@rotta/ui/web";
import { useState } from "react";

/**
 * Fluxo de 2 telas (pedido do usuário, 11/09/2026 — "ao clicar no botão
 * de instalar, deverá ir a uma tela explicando o que aparecerá... aí
 * terá um botão no final para as pessoas poderem baixar de fato"):
 * "Instalar" não baixa nada na hora — leva pra uma tela de explicação/
 * tranquilização, só o botão final desta segunda tela de fato dispara
 * o download do `.apk`.
 *
 * Client component separado da `page.tsx` (que fica Server Component,
 * único jeito de exportar `metadata` — mesmo padrão de
 * `status/status-checker.tsx`).
 */
export function InstallFlow({
  apkUrl,
  apkVersion,
  apkSizeMb,
}: {
  apkUrl: string;
  apkVersion: string;
  apkSizeMb: number;
}): JSX.Element {
  const [step, setStep] = useState<"inicio" | "explicacao">("inicio");

  if (step === "inicio") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-muted">
          <Smartphone size={32} className="text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <Typography variant="headline" as="h1">
            O app oficial da Rotta, direto no seu Android
          </Typography>
          <Typography variant="body" className="max-w-md text-text-muted">
            Mesmo app que está na Google Play — mesma conta, mesmo login, mesmos recursos. Instale
            direto por aqui, sem esperar aprovação de loja nenhuma.
          </Typography>
        </div>
        <button
          type="button"
          onClick={() => setStep("explicacao")}
          className={buttonVariants({ variant: "primary", size: "lg" })}
        >
          Instalar app
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => setStep("inicio")}
        className="flex items-center gap-1.5 self-start text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="flex flex-col gap-1">
        <Typography variant="headline" as="h1">
          Antes de baixar
        </Typography>
        <Typography variant="body" className="text-text-muted">
          O Android vai te avisar sobre instalar um app fora da Play Store — isso é normal, veja o
          que vai acontecer:
        </Typography>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" />
        <div className="flex flex-col gap-1">
          <Typography variant="bodySmall" className="font-semibold text-text">
            Aviso de “fontes desconhecidas”
          </Typography>
          <Typography variant="bodySmall" className="text-text-muted">
            Ao abrir o arquivo baixado, o Android pode pedir permissão pra instalar apps de fora da
            loja. Toque em Configurações e permita — o sistema só pede isso uma vez, não é um alerta
            sobre este app específico, e sim o comportamento padrão pra qualquer instalação fora da
            Play Store.
          </Typography>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-success" />
        <div className="flex flex-col gap-1">
          <Typography variant="bodySmall" className="font-semibold text-text">
            É o app oficial, testado pela nossa equipe
          </Typography>
          <Typography variant="bodySmall" className="text-text-muted">
            Este é o mesmo código, com a mesma assinatura digital do app disponível na Google Play —
            testado internamente pela equipe Rotta antes de cada versão. Não contém nenhum conteúdo
            malicioso.
          </Typography>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <a href={apkUrl} className={buttonVariants({ variant: "primary", size: "lg" })} download>
          <Download size={20} />
          Baixar agora
        </a>
        <Typography variant="caption" className="text-text-muted">
          Versão {apkVersion} · ~{apkSizeMb} MB · Android 8.0 ou mais recente
        </Typography>
      </div>
    </div>
  );
}
