import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@rotta/auth/native";
import { useRef } from "react";

import { AdminNavigator } from "./AdminNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { EmpresaNavigator } from "./EmpresaNavigator";
import { ParentNavigator } from "./ParentNavigator";
import { LIMITE_DE_ESPERA_DA_SPLASH_MS, useLimiteDeEspera } from "./use-limite-de-espera";
import { VinculoPendenteNavigator } from "./VinculoPendenteNavigator";

import { AppSplashScreen } from "@/components/app-splash-screen";
import { usePinLock } from "@/features/auth/hooks/use-pin-lock";
import { PainelWebOnlyScreen, PinLockScreen } from "@/features/auth/screens";
import { useAppMode } from "@/features/driver/hooks/use-app-mode";
import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { IdentityVerificationBlockedScreen } from "@/features/driver/screens/identity-verification-blocked-screen";
import { EmpresaBillingBlockedScreen } from "@/features/empresa/screens";
import { usePushRegistration } from "@/features/notifications/hooks/use-push-registration";
import { VehicleAdminReviewAcknowledgeSheet } from "@/features/vehicles/components/vehicle-admin-review-acknowledge-sheet";
import { AppModeProvider } from "@/providers/app-mode-provider";

/**
 * Navigator raiz — decide entre `AuthNavigator` e o navigator do papel
 * ativo do usuario autenticado (Motorista/Monitor -> `DriverNavigator`,
 * Responsavel -> `ParentNavigator`), conforme Dossie 10 Secao 11.1 e
 * Dossie 23 Secao 4.2: a arvore de navegacao e estruturalmente diferente
 * por papel, nao apenas uma tela escondida por permissao.
 *
 * A sessao real (`@rotta/auth`, Dossie 15) decide isso em tempo de
 * execucao — mesma conta compartilhada com `apps/web`/`apps/admin`, nunca
 * uma variante de build ou app separado (briefing: "nunca aplicativos
 * separados por papel"). Escola ainda nao tem telas proprias no app —
 * ver `PainelWebOnlyScreen`. Admin Rotta (pedido do usuário 05/09/2026:
 * "área do admin no app, porém de forma reduzida") passou a ter
 * `AdminNavigator`, e Empresa/Gestor (pedido do usuário 11/09/2026:
 * "veja oq tem na web e traga para o app oficial") passou a ter
 * `EmpresaNavigator` — ambos recortes deliberadamente pequenos do
 * Painel Web, que continua sendo a ferramenta completa.
 *
 * PIN de acesso rápido (Dossiê 42, opt-in do Motorista no Perfil) — se
 * ativado, `usePinLock` decide se a tela de PIN aparece por cima de
 * tudo isto antes de mostrar o navigator do papel ativo. Fora do
 * `NavigationContainer` de propósito: a tela de PIN não navega para
 * nada, é só um portão sobre uma sessão que já existe.
 *
 * "Modo Ação" (Frente 6 — dono autônomo/MEI que também dirige, mesmo
 * conceito já existente na Web) decide entre `EmpresaNavigator` (Visão
 * completa) e `DriverNavigator` reaproveitado (operação) pra
 * `role === "empresa"` — `useAppMode` é chamado UMA VEZ aqui e
 * compartilhado com os Perfis (onde mora o alternador) via
 * `AppModeProvider`.
 */
export function RootNavigator(): JSX.Element {
  const { status, user } = useAuth();
  const { isLocked, unlock } = usePinLock({ userId: user?.id ?? null, status });
  // Push real (Frente 0) — registra o token do Expo Push Service assim que
  // a sessão fica autenticada; nunca bloqueia nem altera esta árvore de
  // navegação (só efeito colateral, sem UI própria).
  usePushRegistration({ status });

  const appMode = useAppMode(user);

  // Verificação de identidade (Frente J) só se aplica a Motorista/Monitor
  // de verdade OU ao dono autônomo/MEI enquanto estiver em "Modo Ação"
  // (Frente 6 — o backend já libera `SELF_VERIFICATION_ROLES` pra
  // `Role.EMPRESA` com `companyType` AUTONOMO/MEI desde sempre; só
  // faltava o mobile checar nesse caso). Enquanto em "Visão completa",
  // não checa — sem urgência de verificação pra quem só está
  // administrando, não dirigindo. Responsável não usa este fluxo
  // (backend nem aceita `SELF_VERIFICATION_ROLES` pra ele). A query nem
  // dispara fora desses casos.
  const isMotoristaOuMonitor =
    status === "authenticated" &&
    (user?.role === "motorista" ||
      user?.role === "monitor" ||
      (appMode.canToggle && appMode.mode === "acao"));
  const { data: identityVerification, isLoading: isIdentityLoading } = useMyIdentityVerification({
    enabled: isMotoristaOuMonitor,
  });

  // A espera por esta consulta é LIMITADA (18/09/2026 — ver
  // `use-limite-de-espera.ts` para o relato e a causa raiz). Sem o
  // limite, uma API em cold start prendia o app na splash por minutos:
  // a consulta não tem timeout e ainda repete em falha de rede. Como só
  // Motorista/Monitor/Modo Ação disparam esta consulta, o sintoma
  // atingia exatamente os papéis de transportador, e nunca o
  // Responsável.
  const esperouDemaisPelaIdentidade = useLimiteDeEspera(
    isMotoristaOuMonitor && isIdentityLoading,
    LIMITE_DE_ESPERA_DA_SPLASH_MS,
  );

  // INCIDENTE 21/09/2026 — o transportador via a splash PISCANDO em laço
  // ("ROTTA + tela azul e fica piscando toda hora, não carrega").
  //
  // A condição `appMode.canToggle && !appMode.isModeResolved` SAIU
  // daqui, e é o conserto de verdade: ela fazia uma PREFERÊNCIA DE
  // EXIBIÇÃO decidir se o app renderiza.
  //
  // O piscar vinha disso: `useAppMode` marca o modo como "não
  // resolvido" toda vez que seu efeito roda, e o efeito roda de novo
  // sempre que `canToggle` oscila — o que acontece porque o objeto do
  // usuário é reemitido a cada renovação de sessão. Cada oscilação
  // devolvia o app para a splash e tirava de novo: splash, app, splash,
  // app.
  //
  // Escolher entre "Visão completa" e "Modo Ação" não é permissão, é
  // preferência. O certo é abrir na Visão completa (o padrão) e aplicar
  // a preferência guardada quando ela chegar — nunca segurar a tela por
  // causa dela. Hoje isso nem é visível para ninguém: a chave do cofre
  // estava inválida desde sempre (ver `use-app-mode.ts`), então não
  // existe preferência guardada em aparelho nenhum.
  //
  // Sobram só as duas esperas que de fato precisam de resposta antes de
  // decidir a árvore de navegação — e as duas são limitadas no tempo.
  const aindaResolvendoSessao =
    status === "loading" ||
    (isMotoristaOuMonitor && isIdentityLoading && !esperouDemaisPelaIdentidade);

  const esperouDemaisPelaSessao = useLimiteDeEspera(
    aindaResolvendoSessao,
    LIMITE_DE_ESPERA_DA_SPLASH_MS,
  );

  // TETO ABSOLUTO DA SPLASH (21/09/2026).
  //
  // Eu errei a causa desta tela azul duas vezes, e o usuário pagou por
  // isso nas duas. Então esta linha não depende de eu ter acertado a
  // terceira: passado o limite, o app SEGUE, qualquer que seja o estado
  // pendente. Não existe mais caminho — conhecido ou não — que mantenha
  // esta tela no ar para sempre.
  //
  // Seguir é seguro em todos os casos: sem usuário resolvido, a árvore
  // abaixo cai em `AuthNavigator` (a tela de login), que é uma tela onde
  // a pessoa consegue agir. Pedir a senha de novo é um incômodo; ficar
  // olhando um logo é o dia de trabalho perdido.
  //
  // A espera continua existindo para o caso normal — meio segundo de
  // splash enquanto a sessão resolve é o certo, e é o que acontece
  // quando tudo vai bem.
  //
  // TRAVA DE IDA ÚNICA. O teto acima, sozinho, não bastava, e o furo
  // era meu: `useLimiteDeEspera` ZERA a contagem toda vez que a espera
  // termina. Numa condição que oscila, o cronômetro reinicia a cada
  // volta e nunca estoura — exatamente o "fica piscando toda hora", com
  // o teto no lugar e tudo.
  //
  // Então a splash passa a ser de IDA ÚNICA: depois que o app mostrou a
  // árvore de navegação uma vez, ele NUNCA volta para a tela azul nesta
  // execução. Não importa o que oscile depois — cada tela cuida do seu
  // próprio carregamento, como já fazem.
  //
  // Isto vale para toda categoria societária (MEI, autônomo, LTDA,
  // cooperativa, S.A., S/S): a trava não olha papel nem tipo de
  // empresa.
  const jaMostrouOApp = useRef(false);
  const deveMostrarSplash = aindaResolvendoSessao && !esperouDemaisPelaSessao;

  if (deveMostrarSplash && !jaMostrouOApp.current) {
    return <AppSplashScreen />;
  }
  jaMostrouOApp.current = true;

  if (status === "authenticated" && user && isLocked) {
    return <PinLockScreen onUnlock={unlock} />;
  }

  // Ampliado de `=== "REPROVADA"` (mesma mudança de `apps/web`, pedido
  // do usuário: "travar quase tudo" até a identidade estar de fato
  // aprovada) — antes só quem tinha sido RECUSADO ficava bloqueado.
  if (
    isMotoristaOuMonitor &&
    identityVerification != null &&
    identityVerification.status !== "APROVADA"
  ) {
    return <IdentityVerificationBlockedScreen />;
  }

  return (
    <AppModeProvider value={appMode}>
      <NavigationContainer>
        {status === "unauthenticated" || !user ? (
          <AuthNavigator />
        ) : user.role === "motorista" || user.role === "monitor" ? (
          // Frente N — cadastro autônomo (`registerAutonomo`) ainda não tem
          // `companyId` até um `CompanyJoinRequest` ser aprovado.
          user.companyId ? (
            <DriverNavigator />
          ) : (
            <VinculoPendenteNavigator />
          )
        ) : user.role === "responsavel" ? (
          <>
            <ParentNavigator />
            <VehicleAdminReviewAcknowledgeSheet />
          </>
        ) : user.role === "admin_rotta" ? (
          <AdminNavigator />
        ) : user.role === "empresa" || user.role === "gestor" ? (
          // Faturamento (Dossiê 26) — mesma regra da Web
          // (`(dashboard)/layout.tsx`, `BillingBlockScreen`): trial
          // vencido/inadimplente/suspenso/cancelado bloqueia o acesso até
          // regularizar. `billingBlocked` só é `true` pra este papel
          // (nunca pros demais), mas o `&&` é defesa em profundidade.
          user.billingBlocked ? (
            <EmpresaBillingBlockedScreen reason={user.billingBlockedReason ?? null} />
          ) : appMode.mode === "acao" ? (
            // Frente 6 — dono autônomo/MEI em "Modo Ação": reaproveita
            // literalmente o MESMO `DriverNavigator` do Motorista/Monitor
            // (ele não faz nenhuma checagem de papel própria — quem
            // gate-keeps é cada tela, ver `inicio-screen.tsx`/
            // `VeiculoNavigator`). `appMode.canToggle` já garante que só
            // chega aqui quem é `role === "empresa"` com `companyType`
            // AUTONOMO/MEI (nunca LTDA/SA/Cooperativa/Sociedade Simples,
            // nunca `gestor`).
            <DriverNavigator />
          ) : (
            <EmpresaNavigator />
          )
        ) : (
          <PainelWebOnlyScreen />
        )}
      </NavigationContainer>
    </AppModeProvider>
  );
}
