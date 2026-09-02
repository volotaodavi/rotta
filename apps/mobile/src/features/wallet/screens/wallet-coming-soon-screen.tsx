import { ComingSoonScreen } from "@/components/coming-soon-screen";

/**
 * Rotta Pay desativado temporariamente (pedido do usuário 02/09/2026:
 * "A Rotta pay não estará disponível no momento") — mesmo tratamento
 * já dado ao Marketplace/Solicitar Transporte: substitui a tela real
 * (`CarteiraScreen`) no stack de "Meu Veículo", sem apagar nada nem
 * tirar o botão "Rotta Pay: minha carteira" de `MeuVeiculoScreen" — só
 * o destino dele passa a ser este placeholder. Reversível trocando de
 * volta o `component` da rota "Carteira" em `VeiculoNavigator`.
 */
export function WalletComingSoonScreen(): JSX.Element {
  return (
    <ComingSoonScreen
      titulo="Rotta Pay em breve"
      corpo="Sua carteira digital ainda está a caminho. Assim que estiver pronta, você vai poder acompanhar tudo por aqui."
    />
  );
}
