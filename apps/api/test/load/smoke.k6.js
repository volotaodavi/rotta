// Teste de carga (Dossiê 34 — Prompt 24). Ferramenta: k6
// (https://k6.io) — binário separado, não instalado neste monorepo
// (mesma categoria de "ferramenta externa" que EAS/Lighthouse CLI).
//
// ⚠️ NUNCA rode este script contra a API de produção
// (`rotta-vt7i.onrender.com`) sem antes avisar quem opera o serviço —
// um teste de carga é, por definição, indistinguível de um ataque de
// negação de serviço do ponto de vista do servidor. `BASE_URL` abaixo
// aponta para `localhost` por padrão exatamente para isso nunca
// acontecer por acidente.
//
// Uso: `k6 run apps/api/test/load/smoke.k6.js` (contra a API local,
// `pnpm --filter=@rotta/api start:dev` já rodando) ou
// `k6 run -e BASE_URL=https://sua-instancia-de-staging apps/api/test/load/smoke.k6.js`
// contra um ambiente dedicado a teste de carga (nunca produção).
//
// Escopo desta entrega: um "smoke de carga" nos endpoints públicos
// mais baratos (health check, login com credencial inválida — nunca
// cria dado real). NÃO é o teste "1M usuários/50M viagens" citado no
// Prompt 24 — esse exige um ambiente dedicado, dados semeados em
// escala e infraestrutura de observação durante o teste, nenhum dos
// quais existe hoje (ver Dossiê 34 §4 para o runbook de evolução).

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3333/v1";

export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "30s", target: 10 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health/ready`);
  check(health, {
    "health/ready responde 200 ou 503 (nunca timeout/erro de conexão)": (r) =>
      r.status === 200 || r.status === 503,
  });

  // Login com credencial inválida — mede o custo real do Argon2id
  // (hash de senha é deliberadamente caro) sob carga concorrente, sem
  // criar nenhuma sessão/dado.
  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ identificador: "loadtest@rotta.invalid", senha: "senha-invalida" }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(login, {
    "login com credencial inválida responde 401 (nunca 500)": (r) => r.status === 401,
  });

  sleep(1);
}
