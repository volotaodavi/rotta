import { isCorsOriginAllowed } from "../cors-origin.util";

describe("isCorsOriginAllowed", () => {
  const allowedOrigins = ["https://rotta-web.vercel.app", "https://rotta-admin.vercel.app"];

  it("permite uma origem exata da lista", () => {
    expect(isCorsOriginAllowed("https://rotta-web.vercel.app", allowedOrigins, undefined)).toBe(
      true,
    );
  });

  it("recusa uma origem fora da lista quando não há regex configurada", () => {
    expect(isCorsOriginAllowed("https://evil.example.com", allowedOrigins, undefined)).toBe(false);
  });

  it("permite uma origem que casa com CORS_ORIGIN_REGEX (Preview Deployment da Vercel)", () => {
    const previewRegex = /^https:\/\/rotta-(web|admin)-.*-rottabr\.vercel\.app$/;
    expect(
      isCorsOriginAllowed(
        "https://rotta-web-git-feature-x-rottabr.vercel.app",
        allowedOrigins,
        previewRegex,
      ),
    ).toBe(true);
  });

  it("recusa uma origem que não casa com CORS_ORIGIN_REGEX", () => {
    const previewRegex = /^https:\/\/rotta-(web|admin)-.*-rottabr\.vercel\.app$/;
    expect(
      isCorsOriginAllowed("https://attacker-rotta-web.vercel.app", allowedOrigins, previewRegex),
    ).toBe(false);
  });

  it("recusa qualquer origem quando a lista está vazia e não há regex", () => {
    expect(isCorsOriginAllowed("https://rotta-web.vercel.app", [], undefined)).toBe(false);
  });
});
