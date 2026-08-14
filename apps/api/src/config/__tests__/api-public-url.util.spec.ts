import { normalizeApiPublicUrl } from "../api-public-url.util";

describe("normalizeApiPublicUrl", () => {
  it("mantém uma URL já correta (só o host) inalterada", () => {
    expect(normalizeApiPublicUrl("https://rotta-vt7i.onrender.com", "v1")).toBe(
      "https://rotta-vt7i.onrender.com",
    );
  });

  it("remove o sufixo /v1 quando a env var já veio com o prefixo colado (bug real de produção)", () => {
    expect(normalizeApiPublicUrl("https://rotta-vt7i.onrender.com/v1", "v1")).toBe(
      "https://rotta-vt7i.onrender.com",
    );
  });

  it("remove barra final antes de comparar o sufixo", () => {
    expect(normalizeApiPublicUrl("https://rotta-vt7i.onrender.com/v1/", "v1")).toBe(
      "https://rotta-vt7i.onrender.com",
    );
  });

  it("respeita um API_PREFIX customizado", () => {
    expect(normalizeApiPublicUrl("https://api.rotta.com.br/api", "api")).toBe(
      "https://api.rotta.com.br",
    );
  });

  it("não mexe num sufixo que não é o prefixo (ex.: subpath legítimo)", () => {
    expect(normalizeApiPublicUrl("https://rotta-vt7i.onrender.com/v2", "v1")).toBe(
      "https://rotta-vt7i.onrender.com/v2",
    );
  });

  it("é idempotente", () => {
    const once = normalizeApiPublicUrl("https://rotta-vt7i.onrender.com/v1", "v1");
    expect(normalizeApiPublicUrl(once, "v1")).toBe(once);
  });

  it("preserva undefined", () => {
    expect(normalizeApiPublicUrl(undefined, "v1")).toBeUndefined();
  });

  it("preserva string vazia", () => {
    expect(normalizeApiPublicUrl("", "v1")).toBe("");
  });
});
