import { AreaEmBreve } from "@/components/area-em-breve";
import { FUNCIONALIDADES } from "@/lib/funcionalidades";

/**
 * O portão do Marketplace, num lugar só.
 *
 * ## Por que um layout, e não um `if` em cada página
 *
 * Porque o Marketplace tem quatro rotas hoje (solicitações, uma
 * solicitação, contratos, um contrato) e vai ter mais. Um `if` por
 * página é um `if` que alguém esquece na quinta, e a área abre pela
 * porta que ninguém lembrou de fechar. O layout do App Router cobre
 * tudo que estiver abaixo dele, inclusive o que ainda não existe.
 *
 * ## O que ele NÃO faz
 *
 * Não devolve 404 e não redireciona. A área existe, está construída e
 * vai abrir: dizer isso é mais honesto que fingir que a página nunca
 * existiu, e um redirecionamento silencioso para o painel deixaria a
 * pessoa achando que clicou errado.
 *
 * Componente de servidor de propósito: a flag é constante de build, e
 * assim o conteúdo das páginas nem chega ao navegador quando a área
 * está fechada.
 */
export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  if (!FUNCIONALIDADES.marketplace) {
    return (
      <AreaEmBreve
        titulo="Marketplace em breve"
        corpo="Estamos preparando a área onde as famílias encontram e contratam a sua transportadora. Enquanto isso, use os convites por código para vincular um aluno."
      />
    );
  }

  return <>{children}</>;
}
