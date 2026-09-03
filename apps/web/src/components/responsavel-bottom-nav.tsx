"use client";

import { Bell, History, Home, User } from "@rotta/icons";
import { useRouter } from "next/navigation";

import { PortalBottomNav } from "./portal-bottom-nav";

import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { useStudentsList } from "@/features/students/hooks/use-students";

/**
 * Frente AO — o Responsável só tinha uma lista de links de texto no
 * cabeçalho (`RESPONSAVEL_NAV`, `(dashboard)/layout.tsx`), nunca a
 * barra de 4 ícones que aparece nas 3 imagens de referência em TODOS os
 * papéis (Início/Viagens/Notificações/Perfil) — gap real, é bem
 * provavelmente o motivo do usuário achar que a versão web "não está
 * igual". Mesmo componente `PortalBottomNav` do Motorista/Monitor.
 *
 * "Viagens" não tem uma rota fixa: o Painel Web organiza o
 * acompanhamento por aluno (`/alunos/:id/mapa`, com o card "Viagens"
 * Hoje/Semana/Mês — Frente AM), não por um único "meu transporte" como
 * o Marketplace do app mobile. Sempre navega pro mapa/histórico do
 * PRIMEIRO aluno (ordem que a própria lista já usa) — com 2+ filhos dá
 * pra trocar de um pro outro por lá (`VoltarLink` leva de volta pra
 * `/alunos/:id`, e "Meus Alunos" continua na aba Início). Só cai em
 * "Meus Alunos" (`/alunos`) quando não há NENHUM aluno cadastrado
 * ainda — achado real (pedido do usuário 03/09/2026, "quando clica em
 * viagens, não aparece nada"): antes, com 0 OU 2+ filhos, "Viagens"
 * mandava pra `/alunos` — o mesmo lugar que "Início" já mostra, então
 * clicar não parecia fazer nada com 2+ filhos. Mesma query
 * (`useStudentsList({ pageSize: 50 })`) que a própria página usa,
 * então o React Query reaproveita o cache — sem chamada de rede extra.
 */
export function ResponsavelBottomNav(): JSX.Element {
  const router = useRouter();
  const { data: naoLidas } = useUnreadNotificationsCount();
  const { data: alunos } = useStudentsList({ pageSize: 50 });

  function handleViagens(): void {
    const primeiro = alunos?.items[0];
    router.push(primeiro ? `/alunos/${primeiro.id}/mapa` : "/alunos");
  }

  return (
    <PortalBottomNav
      items={[
        { key: "inicio", href: "/alunos", label: "Início", icon: Home, exact: true },
        {
          key: "viagens",
          label: "Viagens",
          icon: History,
          onNavigate: handleViagens,
          activePrefix: "/alunos/",
        },
        {
          key: "notificacoes",
          href: "/notificacoes",
          label: "Notificações",
          icon: Bell,
          badge: naoLidas,
        },
        { key: "perfil", href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
