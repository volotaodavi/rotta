"use client";

/**
 * Mascote animado da tela de login (Dossiê 41 — pedido do usuário: "Type
 * your password. Watch them look away", referência visual trazida de um
 * showcase de componentes de terceiro). Reação inspirada só no CONCEITO
 * (personagens que reagem ao campo de senha) — nada de forma, cor, texto
 * ou marca copiado; desenho e paleta são 100% Rotta (azul institucional
 * + verde/âmbar dos tokens de `globals.css`, mesmas 3 blobs arredondadas
 * já usadas como linguagem visual em `HeroTripPhoneMockup`/`RouteMark`,
 * nunca emoji — Dossiê 36).
 *
 * Estados (`mood`), decididos por quem chama a partir do foco real dos
 * campos — este componente só desenha, nunca lê `document`/refs:
 * - `idle`   — nada focado ainda.
 * - `nosy`   — campo de e-mail focado (curioso, não é dado sensível).
 * - `shy`    — campo de senha focado/sendo digitado (olhos fecham).
 * - `exposed`— senha visível (toggle "mostrar senha") E preenchida —
 *   já está na tela mesmo, então os olhos abrem de novo.
 *
 * Toda a animação é CSS puro (`.login-mascot` em `globals.css`, mesmo
 * padrão do resto do app — sem `styled-jsx`/CSS Modules, que não têm
 * precedente neste código) — este componente só troca o atributo
 * `data-mood`.
 */
export type LoginMascotMood = "idle" | "nosy" | "shy" | "exposed";

const FACES: { tint: string }[] = [
  { tint: "var(--color-primary)" },
  { tint: "var(--color-success)" },
  { tint: "var(--color-warning)" },
];

export function LoginMascot({ mood }: { mood: LoginMascotMood }): JSX.Element {
  return (
    <div
      className="login-mascot flex items-end justify-center gap-3"
      data-mood={mood}
      aria-hidden="true"
    >
      {FACES.map((face, index) => (
        <div
          key={index}
          className="login-mascot__face"
          style={{ ["--face-tint" as string]: face.tint }}
        >
          <div className="login-mascot__eyes">
            <span className="login-mascot__eye">
              <span className="login-mascot__lid" />
            </span>
            <span className="login-mascot__eye">
              <span className="login-mascot__lid" />
            </span>
          </div>
          <span className="login-mascot__mouth" />
        </div>
      ))}
    </div>
  );
}
