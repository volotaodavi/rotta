import Image from "next/image";

import { SITE_ABSTARTUPS_URL } from "@/lib/site-config";

/**
 * "Associada à Abstartups" no rodapé do site público.
 *
 * ## Por que o logotipo tem duas versões, e qual entra aqui
 *
 * O logotipo da Abstartups é azul `#26547C` com o ícone verde
 * `#06D6A0`. Sobre o `#0B0F14` do rodapé (`.ink-scope`, fixo nos dois
 * temas) o azul dá **2,42:1** — a assinatura simplesmente some, e some
 * justamente a parte que diz o nome. O verde do ícone vai bem (10,19:1),
 * mas ícone sozinho não é a marca.
 *
 * Então vale aqui a mesma convenção de `route-wordmark.tsx`: a mesma
 * arte em dois acabamentos de cor. `abstartups-wordmark-light.png` tem a
 * assinatura repintada para `--marketing-ink-text` (`#F5F7FA`, 17:1
 * sobre o rodapé) e o ícone verde intacto; `-dark.png` é o arquivo
 * original, para fundo claro. Os dois saíram do PNG indexado que o Davi
 * enviou, trocando entradas da paleta — os pixels não mudaram, é a mesma
 * arte, nunca um redesenho. Mesmo princípio já aplicado ao logotipo da
 * Asaas em `asaas-security-badge.tsx`.
 *
 * A Abstartups não publica versão monocromática nem manual de marca
 * (conferido em 15/11/2026 na home, `/associe/` e `/sobre/`). Se um dia
 * mandarem o arquivo oficial para fundo escuro, é trocar o PNG.
 *
 * ## Sem caixa
 *
 * O rodapé não tem nenhum elemento emoldurado — só filetes separando
 * faixas. Um selo dentro de um retângulo seria a única caixa da tela,
 * e chamaria mais atenção que a própria informação.
 */
export function AbstartupsBadge(): JSX.Element {
  return (
    <a
      href={SITE_ABSTARTUPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      // O rótulo carrega a frase inteira porque, para quem ouve, "Associada
      // à" e um logotipo em dois nós separados chegam partidos.
      aria-label="Rotta é associada à Abstartups, Associação Brasileira de Startups (abre em nova aba)"
      className="group flex flex-col items-start gap-2 self-start rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:items-end"
    >
      <span className="text-xs text-text-muted">Associada à</span>
      <Image
        src="/brand/abstartups-wordmark-light.png"
        // Vazio de propósito: o `aria-label` do link acima já nomeia tudo,
        // e um `alt` aqui faria o leitor de tela dizer "Abstartups" duas
        // vezes.
        alt=""
        width={824}
        height={177}
        // Menor que a wordmark da Rotta (24px) seria apagar o selo;
        // maior seria a marca do parceiro dominando o rodapé da casa.
        // 24/28px deixa as duas assinaturas com altura de letra
        // parecida — a palavra "abstartups" fica mais larga só porque é
        // mais comprida.
        className="h-6 w-auto sm:h-7"
      />
    </a>
  );
}
