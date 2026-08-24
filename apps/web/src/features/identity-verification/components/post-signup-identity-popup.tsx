"use client";

import { BadgeCheck, ShieldCheck } from "@rotta/icons";
import { Button, Modal, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** `localStorage` (mesmo padrão de `SUPPORT_POPUP_STORAGE_PREFIX` em `verificacao-identidade/page.tsx`) — garante que este convite aparece no máximo uma vez por usuário, nunca de novo depois que ele já viu (mesmo que feche sem clicar no botão). */
const STORAGE_PREFIX = "rotta-popup-identidade:";

/**
 * Pop-up de boas-vindas mostrado UMA vez, logo depois de criar conta —
 * pedido do usuário: "após criar a sua conta, deverá aparecer um pop-up
 * que, clicando no botão do pop-up, irá para a validação de
 * identidade." Só o empurrão inicial amigável: quem fecha sem clicar
 * (ou clica e não termina) continua vendo o mecanismo de bloqueio de
 * verdade — `IdentityVerificationBlockScreen`, renderizado por
 * `(dashboard)/layout.tsx` no lugar de todo o resto do painel enquanto
 * a verificação não estiver `APROVADA` — por cima do qual este `Modal`
 * aparece (o `Modal` usa portal pro `document.body`, então não há
 * conflito de camadas entre os dois).
 *
 * Mostra só quando `status === "NAO_INICIADA"` — ninguém que já
 * começou, está em análise, foi recusado ou aprovado precisa deste
 * convite específico, cada um desses casos já tem sua própria tela.
 */
export function PostSignupIdentityPopup({
  userId,
  status,
}: {
  userId: string;
  status: "NAO_INICIADA" | "EM_ANDAMENTO" | "EM_ANALISE" | "APROVADA" | "REPROVADA" | "EXPIRADA";
}): JSX.Element | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "NAO_INICIADA") return;
    const jaViu = localStorage.getItem(STORAGE_PREFIX + userId) === "1";
    if (!jaViu) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só decide na primeira vez que `status` vira "NAO_INICIADA" pra este usuário; reabrir a cada re-render enquanto continua "NAO_INICIADA" (ex. depois de fechar) reproduziria o próprio bug que o localStorage existe pra evitar.
  }, [userId, status]);

  function marcarVisto(): void {
    localStorage.setItem(STORAGE_PREFIX + userId, "1");
    setOpen(false);
  }

  function verificarAgora(): void {
    marcarVisto();
    router.push("/verificacao-identidade");
  }

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={marcarVisto} ariaLabel="Verifique sua identidade">
      <Modal.Header onClose={marcarVisto}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={20} />
          </span>
          <Typography variant="subtitle">Falta um passo: verifique sua identidade</Typography>
        </div>
      </Modal.Header>
      <Modal.Body>
        <Typography variant="body" color="muted">
          Por segurança de todos — famílias, escolas e motoristas — a Rotta exige verificação de
          identidade antes de liberar o restante da plataforma. Leva poucos minutos: documento + uma
          selfie, tudo pelo celular ou computador.
        </Typography>
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-2">
        <Button variant="ghost" onClick={marcarVisto}>
          Agora não
        </Button>
        <Button iconLeft={<BadgeCheck size={18} />} onClick={verificarAgora}>
          Verificar identidade agora
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
