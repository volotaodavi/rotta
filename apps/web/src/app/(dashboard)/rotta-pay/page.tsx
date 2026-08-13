"use client";

import { Wallet as WalletIcon } from "@rotta/icons";
import { Button, Modal, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";

/**
 * Rotta Pay — "em breve" (pedido explícito do usuário em produção).
 * O `WalletModule` no backend ainda é um "stub honesto" (nenhum
 * provedor de pagamento real contratado, ver Dossiê Rotta Pay §
 * "stub honesto do provedor") — mostrar a tela real de saldo/extrato/
 * saque pra transportadoras de verdade, antes de existir dinheiro de
 * verdade fluindo por trás, criaria uma expectativa que a Rotta ainda
 * não pode cumprir. A implementação completa (saldo, extrato, saque)
 * continua no histórico do git — sai daqui assim que o provedor de
 * pagamento estiver contratado, sem reescrever nada.
 *
 * `router.back()`, não um destino fixo (era `/empresa`) — este item
 * não aparece pro Motorista/Monitor funcionário no menu (Frente H,
 * `(dashboard)/layout.tsx`), mas nada impede alguém de digitar a URL
 * direto; mandar de volta pra onde a pessoa estava funciona pra
 * qualquer papel, sem presumir qual página faz sentido pra ela.
 */
export default function RottaPayPage(): JSX.Element {
  const router = useRouter();

  return (
    <Modal isOpen onClose={() => router.back()} ariaLabel="Rotta Pay — Em breve">
      <Modal.Header onClose={() => router.back()}>Rotta Pay</Modal.Header>
      <Modal.Body className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <WalletIcon size={28} className="text-primary" />
        </div>
        <Typography variant="title">Em breve</Typography>
        <Typography variant="bodySmall" color="muted">
          O Rotta Pay — recebimento de mensalidades, extrato e saque direto pelo painel — está em
          construção. Assim que estiver disponível, avisamos por aqui.
        </Typography>
      </Modal.Body>
      <Modal.Footer className="flex justify-center">
        <Button variant="primary" onClick={() => router.back()}>
          Entendi
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
