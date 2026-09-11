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
 * `APK_DOWNLOAD_URL` aponta pro artefato do build EAS mais recente —
 * link temporário da própria Expo (expira ~30 dias depois do build,
 * ver `expirationDate` em `eas build:view`), não um storage
 * permanente nosso (o projeto ainda não tem S3/Vercel Blob
 * configurado). Precisa ser atualizado à mão a cada novo build até
 * existir um storage de verdade — documentado aqui de propósito, pra
 * não virar um link morto silenciosamente.
 */
const APK_DOWNLOAD_URL =
  "https://expo.dev/artifacts/eas/5XzFtVlCZG1J2rC6DsrF8kDg1qJgEsMrNhPXpf-badQ.apk";
const APK_VERSION = "1.0.0";
const APK_SIZE_MB = 124;

export default function BaixarAppPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-20">
      <InstallFlow apkUrl={APK_DOWNLOAD_URL} apkVersion={APK_VERSION} apkSizeMb={APK_SIZE_MB} />
    </div>
  );
}
