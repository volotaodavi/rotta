"use client";

import { useAuth } from "@rotta/auth/web";
import { BookOpen, Bell, LogOut, Map, MessageCircle, ShieldCheck } from "@rotta/icons";
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
 */
const ATALHOS_PERFIL_MOTORISTA: AtalhoPerfil[] = [
  { href: "/rotas", label: "Minhas rotas", icon: Map },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
  { href: "/verificacao-identidade", label: "Verificar identidade", icon: ShieldCheck },
  { href: "/legal", label: "Documentação Rotta", icon: BookOpen },
];

/**
 * Frente AO — Responsável passou a usar esta mesma página (chegando
 * pela aba "Perfil" do novo `ResponsavelBottomNav`). Nada de Rotta Pay/
 * Verificar identidade (não se aplicam a este papel) nem Notificações/
 * Chamados (Notificações já é a própria aba ao lado na barra; Chamados
 * não existe no "Perfil" do Responsável no app mobile,
 * `parent/screens/perfil-screen.tsx` — só Documentação Rotta) —
 * mínimo necessário, mesmo catálogo do app nativo.
 */
const ATALHOS_PERFIL_RESPONSAVEL: AtalhoPerfil[] = [
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
export default function PerfilPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const atalhos =
    user?.role === "responsavel" ? ATALHOS_PERFIL_RESPONSAVEL : ATALHOS_PERFIL_MOTORISTA;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? ""} />

      <Card>
        <Card.Body className="flex flex-col gap-1">
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
