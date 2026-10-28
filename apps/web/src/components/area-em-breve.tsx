import { Card, EmptyState } from "@rotta/ui/web";

/**
 * O que a pessoa vê ao chegar numa área que a flag mantém fechada.
 *
 * ## Por que a tela também, e não só o link do menu
 *
 * Porque esconder o link não esconde a área: a URL continua
 * funcionando, e ela circula — num print no WhatsApp do grupo da
 * escola, no histórico do navegador de quem já usou, num link que
 * alguém mandou. Sem isto, o link escondido só garante que quem chega
 * lá chega sozinho, sem ninguém para explicar por que a tela está pela
 * metade.
 *
 * É o espelho do `ComingSoonScreen` do aplicativo, com o mesmo tom:
 * diz que a área existe, que ainda não está pronta, e — quando há —
 * o que fazer enquanto isso.
 */
export function AreaEmBreve({
  titulo = "Em breve",
  corpo,
}: {
  titulo?: string;
  corpo: string;
}): JSX.Element {
  return (
    <Card>
      <EmptyState title={titulo} description={corpo} />
    </Card>
  );
}
