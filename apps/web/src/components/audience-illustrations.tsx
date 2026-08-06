/**
 * Ilustrações da seção "Para qual lado da rota você está?" (landing
 * page) — substituem o antigo tratamento de "ícone dentro de círculo"
 * (`AudienceVisual` original) por uma cena pequena e temática por
 * audiência, pedido explícito do usuário ("queria um BANNER de vdd na
 * Rotta, para não ficar só ícone").
 *
 * Não existe integração com ChatGPT/gerador de imagem disponível nesta
 * sessão (nenhuma ferramenta de geração de imagem foi encontrada) — o
 * caminho honesto e imediato foi desenhar estas cenas como SVG vetorial
 * próprio, no mesmo espírito do resto do produto (nenhuma foto de
 * estoque, Dossiê 24 §4.1: paleta restrita a azul/preto/branco/cinza +
 * cores semânticas mínimas). Cada ilustração usa só os tokens de cor da
 * marca via classes Tailwind (`fill-primary`, `fill-border` etc.), nunca
 * hexadecimal solto, e herda o tom (`tone`) da audiência para reforçar a
 * mesma cor já usada no ícone/badge do bloco de texto ao lado.
 */

interface IllustrationProps {
  className?: string;
}

/** Responsável — celular com mapa ao vivo: rota pontilhada até o pino do destino, com um "ping" indicando rastreamento em tempo real. */
export function ResponsavelIllustration({ className }: IllustrationProps): JSX.Element {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <rect
        x={44}
        y={40}
        width={240}
        height={320}
        rx={32}
        className="fill-card stroke-border"
        strokeWidth={3}
      />
      <rect x={64} y={72} width={200} height={256} rx={16} className="fill-primary/10" />

      <path
        d="M 96 260 C 130 220, 150 200, 170 160 S 210 90, 250 96"
        className="stroke-primary"
        strokeWidth={4}
        strokeDasharray="2 14"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={96} cy={260} r={9} className="fill-secondary" />
      <g>
        <circle cx={250} cy={96} r={20} className="fill-primary/25">
          <animate attributeName="r" values="16;24;16" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <path
          d="M250 82c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z"
          className="fill-primary"
        />
        <circle cx={250} cy={98} r={5} className="fill-card" />
      </g>

      <g transform="translate(148,168)">
        <rect x={-16} y={-9} width={32} height={18} rx={6} className="fill-primary" />
        <circle cx={-8} cy={9} r={5} className="fill-secondary" />
        <circle cx={8} cy={9} r={5} className="fill-secondary" />
      </g>

      <g transform="translate(220,300)">
        <rect
          x={0}
          y={0}
          width={128}
          height={64}
          rx={14}
          className="fill-card stroke-border"
          strokeWidth={3}
        />
        <circle cx={22} cy={22} r={10} className="fill-success/20" />
        <path
          d="M17 22l4 4 8-8"
          className="stroke-success"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x={42} y={16} width={70} height={7} rx={3.5} className="fill-border" />
        <rect x={42} y={32} width={50} height={7} rx={3.5} className="fill-border" />
      </g>
    </svg>
  );
}

/** Transportadora — painel de controle: gráfico de barras + frota resumida em miniatura. */
export function TransportadoraIllustration({ className }: IllustrationProps): JSX.Element {
  const bars = [
    { x: 80, height: 54, tone: "fill-secondary/25" },
    { x: 132, height: 86, tone: "fill-secondary/45" },
    { x: 184, height: 112, tone: "fill-secondary" },
    { x: 236, height: 70, tone: "fill-secondary/45" },
  ];
  const vans = [72, 162, 252];

  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <rect
        x={40}
        y={64}
        width={320}
        height={248}
        rx={20}
        className="fill-card stroke-border"
        strokeWidth={3}
      />
      <rect x={40} y={64} width={320} height={40} rx={20} className="fill-secondary/10" />
      <circle cx={64} cy={84} r={6} className="fill-danger/70" />
      <circle cx={84} cy={84} r={6} className="fill-warning/70" />
      <circle cx={104} cy={84} r={6} className="fill-success/70" />
      <circle cx={332} cy={84} r={16} className="fill-success/15" />
      <path
        d="M324 84l5 5 9-10"
        className="stroke-success"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={250 - bar.height}
          width={32}
          height={bar.height}
          rx={6}
          className={bar.tone}
        />
      ))}

      {vans.map((x) => (
        <g key={x}>
          <rect x={x + 6} y={264} width={18} height={12} rx={4} className="fill-secondary" />
          <rect x={x} y={270} width={66} height={26} rx={8} className="fill-secondary" />
          <circle cx={x + 16} cy={296} r={7} className="fill-card stroke-border" strokeWidth={2} />
          <circle cx={x + 50} cy={296} r={7} className="fill-card stroke-border" strokeWidth={2} />
        </g>
      ))}
    </svg>
  );
}

/** Motorista — van seguindo a rota do dia, com checklist do veículo flutuando ao lado. */
export function MotoristaIllustration({ className }: IllustrationProps): JSX.Element {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <rect x={20} y={272} width={360} height={64} rx={12} className="fill-border" />
      <line
        x1={44}
        y1={304}
        x2={356}
        y2={304}
        className="stroke-card"
        strokeWidth={5}
        strokeDasharray="18 16"
        strokeLinecap="round"
      />

      <path
        d="M 168 272 C 200 220, 230 200, 262 156 S 300 96, 336 88"
        className="stroke-success"
        strokeWidth={4}
        strokeDasharray="2 14"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M336 74c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z"
        className="fill-success"
      />
      <circle cx={336} cy={90} r={5} className="fill-card" />

      <g transform="translate(60,196)">
        <rect x={0} y={20} width={140} height={56} rx={12} className="fill-success" />
        <path
          d="M0 60 L18 30 Q24 20 36 20 H108 Q120 20 126 32 L140 60 Z"
          className="fill-success"
        />
        <rect x={30} y={30} width={30} height={20} rx={4} className="fill-primary/15" />
        <rect x={66} y={30} width={26} height={20} rx={4} className="fill-primary/15" />
        <circle cx={30} cy={80} r={14} className="fill-secondary stroke-border" strokeWidth={3} />
        <circle cx={110} cy={80} r={14} className="fill-secondary stroke-border" strokeWidth={3} />
      </g>

      <g transform="translate(150,120)">
        <rect
          x={0}
          y={0}
          width={92}
          height={104}
          rx={12}
          className="fill-card stroke-border"
          strokeWidth={3}
        />
        <rect x={26} y={-8} width={40} height={16} rx={6} className="fill-border" />
        {[0, 1, 2].map((index) => (
          <g key={index} transform={`translate(14, ${24 + index * 26})`}>
            <rect width={16} height={16} rx={4} className="fill-success/15" />
            <path
              d="M3 8l3 3 7-7"
              className="stroke-success"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x={26} y={5} width={40} height={6} rx={3} className="fill-border" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Monitor — alunos embarcando com confirmação registrada, sem o motorista dirigir. */
export function MonitorIllustration({ className }: IllustrationProps): JSX.Element {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <rect x={20} y={280} width={360} height={16} rx={8} className="fill-border" />

      <g transform="translate(50,130)">
        <rect x={0} y={0} width={210} height={120} rx={20} className="fill-info" />
        {[14, 60, 106, 152].map((x) => (
          <rect key={x} x={x} y={18} width={26} height={28} rx={6} className="fill-primary/15" />
        ))}
        <rect x={182} y={48} width={22} height={62} rx={6} className="fill-card/30" />
        <circle cx={26} cy={120} r={16} className="fill-secondary stroke-border" strokeWidth={4} />
        <circle cx={184} cy={120} r={16} className="fill-secondary stroke-border" strokeWidth={4} />
      </g>

      <g transform="translate(276,192)">
        <circle cx={0} cy={0} r={13} className="fill-secondary" />
        <path d="M-14 40 Q-14 16 0 16 Q14 16 14 40 Z" className="fill-secondary" />
      </g>
      <g transform="translate(306,202)">
        <circle cx={0} cy={0} r={11} className="fill-secondary/70" />
        <path d="M-12 34 Q-12 12 0 12 Q12 12 12 34 Z" className="fill-secondary/70" />
      </g>

      <g transform="translate(258,146)">
        <circle cx={0} cy={0} r={22} className="fill-info/20 stroke-card" strokeWidth={4} />
        <path
          d="M-8 0l6 6 12-12"
          className="stroke-info"
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <g transform="translate(58,60)">
        <rect
          x={0}
          y={0}
          width={120}
          height={54}
          rx={12}
          className="fill-card stroke-border"
          strokeWidth={3}
        />
        <circle cx={20} cy={27} r={9} className="fill-info/20" />
        <path
          d="M16 27l3 3 7-7"
          className="stroke-info"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x={38} y={16} width={64} height={7} rx={3.5} className="fill-border" />
        <rect x={38} y={32} width={44} height={7} rx={3.5} className="fill-border" />
      </g>
    </svg>
  );
}
