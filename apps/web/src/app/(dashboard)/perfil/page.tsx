"use client";

import { useAuth } from "@rotta/auth/web";
import { BookOpen, Bell, LogOut, MessageCircle, ShieldCheck, Wallet } from "@rotta/icons";
import { Card, PanelGreeting, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

const ROLE_LABEL: Record<string, string> = {
  empresa: "Autônomo/MEI",
  motorista: "Motorista",
  monitor: "Monitor(a)",
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
 */
const ATALHOS_PERFIL: AtalhoPerfil[] = [
  { href: "/rotta-pay", label: "Rotta Pay", icon: Wallet },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
  { href: "/verificacao-identidade", label: "Verificar identidade", icon: ShieldCheck },
  { href: "/legal", label: "Documentação Rotta", icon: BookOpen },
];

/**
 * "Perfil" (Frente O) — porta de `apps/mobile/.../perfil-screen.tsx`
 * pro Painel Web: vira o hub de conta do motorista/monitor funcionário/
 * autônomo/MEI depois que a barra de navegação reduziu a 4 ícones
 * (Início/Atividades/Veículo/Perfil, pedido do usuário com imagem de
 * referência). Sem isso, Rotta Pay/Notificações/Chamados ficariam sem
 * nenhum caminho de acesso pra este público.
 */
export default function PerfilPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();

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
        {ATALHOS_PERFIL.map(({ href, label, icon: Icon }) => (
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
