"use client";

import { useAuth } from "@rotta/auth/web";
import {
  BookOpen,
  Bell,
  Car,
  LogOut,
  Map,
  MessageCircle,
  ShieldCheck,
  Truck,
  Users,
} from "@rotta/icons";
import { Card, PanelGreeting, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

const ROLE_LABEL: Record<string, string> = {
  empresa: "Autônomo/MEI",
  motorista: "Motorista",
  monitor: "Monitor(a)",
  responsavel: "Responsável",
};

interface AtalhoPerfil {
  href: Route;
  label: string;
  icon: LucideIcon;
}

/**
 * Atalhos que o "Perfil" absorve depois que a barra de navegação virou
 * 4 ícones (Frente O) — antes eram links de texto separados no
 * cabeçalho (Rotta Pay/Notificações/Chamados). Mesmo catálogo de
 * `EMPLOYEE_DRIVER_NAV`/`ACTION_NAV` de antes, só que centralizado
 * aqui em vez de espalhado na barra — igual ao "Perfil" do app mobile
 * (`DriverPerfilScreen`, que já bundle Verificar identidade/
 * Documentação/Sair).
 *
 * "Minhas rotas" (fluxo novo de Rotas — pedido do usuário: "no modo
 * ação também aparece essa opção") — único ponto de entrada do
 * motorista/monitor autônomo/MEI pra criar/gerenciar/executar rotas,
 * já que a barra inferior de 4 ícones não ganha um 5º item.
 *
 * "Meu Veículo" (Frente AP — pedido do usuário: "averiguação de
 * veículos no modo ação") — corrige uma divergência real com o app
 * mobile: `DriverPerfilScreen` (`apps/mobile/.../perfil-screen.tsx`)
 * já tem esse atalho desde a Frente AO, com um comentário afirmando
 * que ele "virou um atalho aqui, igual à versão web" — só que a versão
 * web nunca ganhou de fato. `/veiculo` (Frente O) existia, só ficou sem
 * nenhum caminho de acesso aqui desde que "Veículo" saiu da barra de 4
 * ícones.
 */
const ATALHOS_PERFIL_MOTORISTA: AtalhoPerfil[] = [
  { href: "/rotas", label: "Minhas rotas", icon: Map },
  { href: "/veiculo", label: "Meu veículo", icon: Car },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
  { href: "/verificacao-identidade", label: "Verificar identidade", icon: ShieldCheck },
  { href: "/legal", label: "Documentação Rotta", icon: BookOpen },
];

/**
 * "Equipe" e "Veículos" (Frente AP — pedido do usuário: "deverá ter a
 * questão de motoristas e veículos no modo ação, lá no hambúrguer... no
 * motorista MEI/autônomo, o próprio dono da empresa é o motorista. Mas
 * se ele quiser colocar outro motorista, ele pode cadastrar [em] '/equipe'
 * (mesmo fluxo de convite já usado na Visão completa, tarefa "Tela
 * 'Equipe': permitir adicionar motorista adicional e monitor") e
 * `/veiculos` (frota — cadastro de novos veículos, plural, diferente do
 * "Meu veículo" acima que só EXIBE o veículo já vinculado). Só pro
 * dono autônomo/MEI (`role === "empresa"`, o mesmo `canToggle` de
 * `useAppMode`) — um Motorista/Monitor FUNCIONÁRIO não tem empresa
 * nenhuma pra gerenciar aqui, então nunca vê este atalho.
 */
const ATALHOS_PERFIL_DONO: AtalhoPerfil[] = [
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/veiculos", label: "Veículos", icon: Truck },
];

/**
 * Frente AO — Responsável passou a usar esta mesma página (chegando
 * pela aba "Perfil" do novo `ResponsavelBottomNav`). Nada de Rotta Pay/
 * Verificar identidade (não se aplicam a este papel) — Notificações já
 * é a própria aba ao lado na barra.
 *
 * "Chamados" (Epic B — antes bloqueado, `SupportService.createTicket`
 * só aceitava Empresa/Gestor): agora que o backend libera
 * `Role.RESPONSAVEL`, este é o único ponto de entrada — a tela
 * (`/chamados`) já é genérica o bastante pra funcionar sem nenhuma
 * mudança, só precisava de um link.
 */
const ATALHOS_PERFIL_RESPONSAVEL: AtalhoPerfil[] = [
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
  { href: "/legal", label: "Documentação Rotta", icon: BookOpen },
];

/**
 * "Perfil" (Frente O, estendido ao Responsável na Frente AO) — porta de
 * `apps/mobile/.../perfil-screen.tsx` pro Painel Web: vira o hub de
 * conta de quem usa a barra de 4 ícones (motorista/monitor funcionário/
 * autônomo/MEI em Modo Ação, e agora também o Responsável) em vez do
 * cabeçalho de texto. Sem isso, os atalhos que saíram do cabeçalho
 * ficariam sem nenhum caminho de acesso pra este público.
 */
/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

export default function PerfilPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const atalhos =
    user?.role === "responsavel"
      ? ATALHOS_PERFIL_RESPONSAVEL
      : user?.role === "empresa"
        ? [
            ATALHOS_PERFIL_MOTORISTA[0]!,
            ...ATALHOS_PERFIL_DONO,
            ...ATALHOS_PERFIL_MOTORISTA.slice(1),
          ]
        : ATALHOS_PERFIL_MOTORISTA;

  // Avatar de identidade em todos os papéis — Motorista/Monitor usam os
  // tokens isolados dessas telas (driverPrimary/monitorAccent);
  // Empresa/Responsável usam o `primary` compartilhado de sempre (spec
  // do Responsável: "não é obrigatório usar essas cores... utilize os
  // tokens existentes" — nenhum token novo só pra isto).
  const avatarClassName =
    user?.role === "monitor"
      ? "bg-monitorAccent-muted text-monitorAccent"
      : user?.role === "motorista"
        ? "bg-driverPrimary-muted text-driverPrimary"
        : "bg-primary-muted text-primary";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? ""} />

      <Card>
        <Card.Body className="flex items-center gap-3">
          {avatarClassName ? (
            <div
              className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-lg font-bold ${avatarClassName}`}
            >
              {iniciais(user?.nome)}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <Typography variant="subtitle">{user?.nome}</Typography>
            <Typography variant="bodySmall" color="muted">
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
            </Typography>
            {user?.companyName ? (
              <Typography variant="bodySmall" color="muted">
                {user.companyName}
              </Typography>
            ) : null}
            <Typography variant="bodySmall" color="muted">
              {user?.email}
            </Typography>
          </div>
        </Card.Body>
      </Card>

      <div className="flex flex-col gap-2">
        {atalhos.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card interactive>
              <Card.Body className="flex items-center gap-3 py-4">
                <Icon size={18} className="text-text-muted" />
                <Typography variant="bodySmall" className="font-medium">
                  {label}
                </Typography>
              </Card.Body>
            </Card>
          </Link>
        ))}
      </div>

      <Card interactive onClick={() => void logout().then(() => router.replace("/entrar"))}>
        <Card.Body className="flex items-center gap-3 py-4">
          <LogOut size={18} className="text-danger" />
          <Typography variant="bodySmall" className="font-medium text-danger">
            Sair
          </Typography>
        </Card.Body>
      </Card>
    </div>
  );
}
