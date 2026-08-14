import { Card, Typography } from "@rotta/ui/web";

import type { DiditDecision, DiditWarning } from "../didit-decision.types";

/**
 * Evidência visual da verificação Didit — pedido do usuário: "quero
 * colocar o painel do Didit no painel de verificação de identidade da
 * Rotta, literalmente a tela do Didit ali". Verificado (busca na
 * documentação pública da Didit) que não existe um embed pra tela de
 * REVISOR — só o fluxo do PRÓPRIO usuário (quem faz a selfie/documento)
 * é embutível via iframe; a revisão manual acontece só no Business
 * Console deles, que não expõe embed. Em vez de um iframe que não
 * existe, isto renderiza as FOTOS e SCORES reais que a Didit já manda
 * de volta no payload da decisão (`liveness.reference_image`,
 * `face_match.source_image`/`target_image`, scores 0-100) — a mesma
 * evidência que um revisor veria no Business Console, só que dentro do
 * próprio visual da Rotta, sem trocar de aba.
 */
export function DiditEvidenceCard({ decisao }: { decisao: DiditDecision }): JSX.Element | null {
  const { liveness, face_match: faceMatch } = decisao;
  const hasSelfie = typeof liveness?.reference_image === "string";
  const hasFaceMatch =
    typeof faceMatch?.source_image === "string" && typeof faceMatch.target_image === "string";

  if (!hasSelfie && !hasFaceMatch) return null;

  return (
    <Card>
      <Card.Header title="Evidência da verificação (Didit)" />
      <Card.Body className="flex flex-col gap-6">
        {hasFaceMatch && faceMatch && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Typography variant="bodySmall" className="font-semibold">
                Reconhecimento facial
              </Typography>
              {typeof faceMatch.score === "number" && (
                <Typography
                  variant="bodySmall"
                  color={faceMatch.score >= 70 ? "success" : "danger"}
                >
                  {faceMatch.score}% de similaridade
                </Typography>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EvidenceImage src={faceMatch.source_image} label="Selfie (capturada na hora)" />
              <EvidenceImage src={faceMatch.target_image} label="Foto do documento" />
            </div>
            <WarningsList warnings={faceMatch.warnings} />
          </div>
        )}

        {hasSelfie && liveness && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Typography variant="bodySmall" className="font-semibold">
                Prova de vida{liveness.method ? ` — ${liveness.method}` : ""}
              </Typography>
              {typeof liveness.score === "number" && (
                <Typography variant="bodySmall" color={liveness.score >= 70 ? "success" : "danger"}>
                  {liveness.score}/100
                </Typography>
              )}
            </div>
            <div className="max-w-[220px]">
              <EvidenceImage src={liveness.reference_image} label="Selfie da prova de vida" />
            </div>
            {liveness.video_url && (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- gravação de prova de vida da Didit, sem legenda disponível na origem.
              <video
                src={liveness.video_url}
                controls
                className="max-w-xs rounded-lg border border-border"
              />
            )}
            <WarningsList warnings={liveness.warnings} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

function EvidenceImage({ src, label }: { src?: string; label: string }): JSX.Element | null {
  if (!src) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {/* URL assinada e temporária da Didit — nunca um asset estático, então plain <img> (o otimizador de imagem do Next não tem o que fazer com um domínio dinâmico por sessão). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ver comentário acima. */}
      <img src={src} alt={label} className="w-full rounded-lg border border-border object-cover" />
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
    </div>
  );
}

function WarningsList({ warnings }: { warnings?: DiditWarning[] }): JSX.Element | null {
  const descriptions = (warnings ?? [])
    .map((warning) => warning.long_description ?? warning.short_description)
    .filter((description): description is string => Boolean(description));

  if (descriptions.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {descriptions.map((description) => (
        <li key={description}>
          <Typography variant="caption" color="danger">
            ⚠ {description}
          </Typography>
        </li>
      ))}
    </ul>
  );
}
