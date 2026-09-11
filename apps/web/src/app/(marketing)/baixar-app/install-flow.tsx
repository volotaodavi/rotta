"use client";

import { AlertTriangle, Download, ShieldCheck, Smartphone } from "@rotta/icons";
import { Button, buttonVariants, Modal, Typography } from "@rotta/ui/web";
import { useState } from "react";

/**
 * Fluxo em pop-up de verdade (pedido do usuário, 11/09/2026 — "ao
 * clicar no botão de instalar, deverá ir a uma tela explicando o que
 * aparecerá... aí terá um botão no final para as pessoas poderem
 * baixar de fato"; depois esclarecido: "cadê aquele pou-up?" — queria
 * um `Modal` de verdade, não uma segunda tela substituindo a primeira).
 * "Instalar app" abre o `Modal` (`@rotta/ui/web`, já existente no
 * catálogo) por cima da página; só o botão "Baixar agora" dentro dele
 * dispara o download real do `.apk`.
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-muted">
          <Smartphone size={32} className="text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <Typography variant="headline" as="h1">
            O app oficial da Rotta, direto no seu Android
          </Typography>
          <Typography variant="body" className="max-w-md text-text-muted">
            Mesmo app que está na Google Play, com a mesma conta, o mesmo login e os mesmos
            recursos. Instale direto por aqui, sem esperar aprovação de loja nenhuma.
          </Typography>
        </div>
        <Button variant="primary" size="lg" onClick={() => setIsOpen(true)}>
          Instalar app
        </Button>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} ariaLabel="Antes de baixar o app">
        <Modal.Header onClose={() => setIsOpen(false)}>Antes de baixar</Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" className="text-text-muted">
            O Android vai te avisar sobre instalar um app fora da Play Store. Isso é normal, veja o
            que vai acontecer:
          </Typography>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <Typography variant="bodySmall" className="font-semibold text-text">
                Aviso de “fontes desconhecidas”
              </Typography>
              <Typography variant="caption" className="text-text-muted">
                Ao abrir o arquivo baixado, o Android pode pedir permissão pra instalar apps de fora
                da loja. Toque em Configurações e permita. O sistema só pede isso uma vez; não é um
                alerta sobre este app específico, e sim o comportamento padrão pra qualquer
                instalação fora da Play Store.
              </Typography>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-success" />
            <div className="flex flex-col gap-1">
              <Typography variant="bodySmall" className="font-semibold text-text">
                É o app oficial, testado pela nossa equipe
              </Typography>
              <Typography variant="caption" className="text-text-muted">
                Este é o mesmo código, com a mesma assinatura digital do app disponível na Google
                Play. Testado internamente pela equipe Rotta antes de cada versão. Não contém nenhum
                conteúdo malicioso.
              </Typography>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="items-center">
          {/* `Modal.Footer` é `flex-col-reverse` no mobile (Dossiê 25 §4.6)
              — o legenda vem ANTES no JSX de propósito, pra sair embaixo
              do botão depois de invertido visualmente. */}
          <Typography variant="caption" className="text-text-muted">
            Versão {apkVersion} · ~{apkSizeMb} MB · Android 8.0 ou mais recente
          </Typography>
          <a
            href={apkUrl}
            className={buttonVariants({ variant: "primary", size: "lg", fullWidth: true })}
            download
          >
            <Download size={20} />
            Baixar agora
          </a>
        </Modal.Footer>
      </Modal>
    </>
  );
}
