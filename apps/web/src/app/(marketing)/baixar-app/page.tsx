import { InstallFlow } from "./install-flow";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baixar o app Rotta para Android",
  description:
    "Instale o app oficial da Rotta direto no seu Android, sem passar pela Google Play. Mesma conta, mesmo login, mesmos recursos.",
  alternates: { canonical: "/baixar-app" },
};

/**
 * Download direto do `.apk` (pedido do usuário, 11/09/2026 — "o app
 * verdadeiro... sem precisar da Play Store... onde as pessoas instalam
 * diretamente do navegador"). Android permite instalar um `.apk`
 * baixado de qualquer lugar (com aviso de "fontes desconhecidas") —
 * iOS não tem equivalente sem passar pela App Store/TestFlight, então
 * esta página é Android-only de propósito.
 *
 * `InstallFlow` (client component) abre um `Modal` de verdade
 * (`@rotta/ui/web`) ao clicar em "Instalar" — primeiro explica o aviso
 * do Android e tranquiliza que o app é seguro/testado, só então mostra
 * o botão real de download dentro do próprio pop-up.
 *
 * `APK_DOWNLOAD_URL` aponta pra uma GitHub Release do próprio
 * repositório (11/09/2026) — link público permanente, não expira
 * (diferente do artefato temporário da Expo usado antes, que caducava
 * ~30 dias depois do build). O `.apk` é gerado pelo workflow
 * `.github/workflows/build-android-local.yml` (`eas build --local`
 * rodando num runner do GitHub Actions, sem consumir a cota de build
 * em nuvem da EAS) e publicado automaticamente como Release ao final
 * de cada run. Este build específico já inclui a correção do
 * `EXPO_PUBLIC_WEB_URL` faltante no `eas.json` (causa da tela branca
 * ao abrir o app instalado). Precisa ser atualizado à mão a cada novo
 * build até existir um domínio fixo tipo `download.rotta...` —
 * documentado aqui de propósito, pra não virar um link morto
 * silenciosamente.
 */
const APK_DOWNLOAD_URL =
  "https://github.com/volotaodavi/rotta/releases/download/android-preview-run34650790740/rotta-preview.apk";
const APK_VERSION = "1.0.0";
const APK_SIZE_MB = 124;

export default function BaixarAppPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-20">
      <InstallFlow apkUrl={APK_DOWNLOAD_URL} apkVersion={APK_VERSION} apkSizeMb={APK_SIZE_MB} />
    </div>
  );
}
