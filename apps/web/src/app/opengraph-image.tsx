import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

/**
 * Imagem de compartilhamento social (Open Graph/Twitter Card) — antes o
 * `layout.tsx` reaproveitava o ícone quadrado da marca
 * (`rotta-mark-512.png`) como `openGraph.images`, que aparece cortado/
 * minúsculo nos previews do WhatsApp/Facebook/LinkedIn (todos esperam
 * proporção ~1.91:1, não um quadrado). Esta convenção nativa do
 * Next.js 15 (`opengraph-image.tsx` na raiz de `app/`) gera uma imagem
 * 1200×630 dedicada em cada build/request via `ImageResponse` — mesma
 * lógica de "desenhar com código, nunca gerar num editor externo/IA de
 * imagem" já usada em `HeroTripPhoneMockup`/`RouteMark`/o mascote do
 * login. Aplica-se a toda página que não tiver seu próprio
 * `opengraph-image.tsx` (nenhuma tem hoje, então cobre o site inteiro).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — ${SITE_DESCRIPTION}`;

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "80px 96px",
        backgroundColor: "#0B0F14",
        backgroundImage: "linear-gradient(135deg, #0B0F14 0%, #101828 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 700 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #5A8CFF 0%, #3B6EF6 100%)",
              fontSize: 40,
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            R
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#F5F7FA" }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#F5F7FA", lineHeight: 1.15 }}>
          Transporte escolar rastreado em tempo real
        </div>
        <div style={{ fontSize: 26, color: "#9AA4B2", lineHeight: 1.4 }}>{SITE_DESCRIPTION}</div>
      </div>
    </div>,
    { ...size },
  );
}
