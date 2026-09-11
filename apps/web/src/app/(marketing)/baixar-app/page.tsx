import { CheckCircle2, Download, ShieldCheck, Smartphone } from "@rotta/icons";
import { buttonVariants, Typography } from "@rotta/ui/web";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baixar o app Rotta para Android",
  description:
    "Instale o app oficial da Rotta direto no seu Android, sem passar pela Google Play — mesma conta, mesmo login, mesmos recursos.",
  alternates: { canonical: "/baixar-app" },
};

/**
 * Download direto do `.apk` (pedido do usuário, 11/09/2026 — "o app
 * verdadeiro... sem precisar da Play Store... onde as pessoas instalam
 * diretamente do navegador"). Android permite instalar um `.apk`
 * baixado de qualquer lugar (com aviso de "fontes desconhecidas") —
 * iOS não tem equivalente sem passar pela App Store/TestFlight, então
 * esta página é Android-only de propósito, nunca promete o mesmo pra
 * iPhone.
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

const PASSOS_INSTALACAO = [
  'Toque em "Baixar para Android" abaixo — o arquivo (.apk) vai pra pasta de downloads do seu celular.',
  'Abra o arquivo baixado. Se aparecer um aviso sobre "instalar apps de fontes desconhecidas", toque em Configurações e permita — só precisa fazer isso uma vez.',
  "Toque em Instalar. Pronto: o ícone da Rotta aparece na sua tela como qualquer outro app.",
];

export default function BaixarAppPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-muted">
          <Smartphone size={32} className="text-primary" />
        </div>
        <Typography variant="headline" as="h1">
          O app oficial da Rotta, direto no seu Android
        </Typography>
        <Typography variant="body" className="max-w-md text-text-muted">
          Mesmo app que está na Google Play — mesma conta, mesmo login, mesmos recursos. Instale
          direto por aqui, sem esperar aprovação de loja nenhuma.
        </Typography>
      </div>

      <div className="flex flex-col items-center gap-3">
        <a
          href={APK_DOWNLOAD_URL}
          className={buttonVariants({ variant: "primary", size: "lg" })}
          download
        >
          <Download size={20} />
          Baixar para Android
        </a>
        <Typography variant="caption" className="text-text-muted">
          Versão {APK_VERSION} · ~{APK_SIZE_MB} MB · Android 8.0 ou mais recente
        </Typography>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <Typography variant="subtitle" as="h2">
          Como instalar
        </Typography>
        <ol className="flex flex-col gap-3">
          {PASSOS_INSTALACAO.map((passo, index) => (
            <li key={passo} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <Typography variant="bodySmall" className="text-text-muted">
                {passo}
              </Typography>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-6">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-success" />
        <Typography variant="bodySmall" className="text-text-muted">
          O aviso de “fontes desconhecidas” é padrão do Android pra qualquer app instalado fora da
          Play Store — não é um alerta de risco deste app específico. O Rotta é o mesmo aplicativo,
          construído e assinado pela nossa própria conta de desenvolvedor.
        </Typography>
      </div>

      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-text-muted" />
        <Typography variant="caption" className="text-text-muted">
          Disponível só para Android por enquanto — no iPhone, use{" "}
          <a href="/entrar" className="text-primary hover:underline">
            o site direto pelo Safari
          </a>{" "}
          e adicione à Tela de Início pra abrir como app.
        </Typography>
      </div>
    </div>
  );
}
