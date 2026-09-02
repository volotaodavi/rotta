import { ComingSoonScreen } from "@/components/coming-soon-screen";

/**
 * Marketplace desativado temporariamente (pedido do usuário
 * 01/09/2026: "'solicitar transporte' pode ficar inativo, incluindo o
 * marketplace, a página deverá aparecer uma mensagem de 'em breve'") —
 * substitui inteiro o `MarketplaceNavigator` (busca de transportador,
 * detalhes, código, solicitar transporte) na aba "Início" do
 * Responsável. Nenhuma tela do stack original foi apagada — só
 * desconectada da navegação (`ParentNavigator`); é reversível trocando
 * de volta o `component` daquela aba.
 */
export function MarketplaceComingSoonScreen(): JSX.Element {
  return (
    <ComingSoonScreen corpo="Estamos preparando essa área pra você buscar e contratar uma transportadora direto pelo app. Enquanto isso, use um código de convite que a transportadora te passar pra vincular o seu filho." />
  );
}
