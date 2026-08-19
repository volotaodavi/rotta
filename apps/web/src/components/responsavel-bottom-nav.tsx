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
 * o Marketplace do app mobile. Com só 1 filho cadastrado (caso comum),
 * navega direto pro mapa dele; com 0 ou 2+, cai em "Meus Alunos"
 * (`/alunos`, que já é a própria home/"Início" — lá dá pra escolher ou
 * cadastrar). Mesma query (`useStudentsList({ pageSize: 50 })`) que a
 * própria página usa, então o React Query reaproveita o cache — sem
 * chamada de rede extra.
 */
export function ResponsavelBottomNav(): JSX.Element {
  const router = useRouter();
  const { data: naoLidas } = useUnreadNotificationsCount();
  const { data: alunos } = useStudentsList({ pageSize: 50 });

  function handleViagens(): void {
    const unico = alunos?.items.length === 1 ? alunos.items[0] : undefined;
    router.push(unico ? `/alunos/${unico.id}/mapa` : "/alunos");
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
