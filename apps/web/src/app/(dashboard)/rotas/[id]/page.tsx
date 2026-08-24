import { RouteDetailClient } from "./_components/route-detail-client";

/**
 * Server Component mínimo — só resolve `params` (Promise, contrato do
 * App Router) com `await` e repassa o valor final (`string`) pro
 * Client Component. Ver a nota completa em
 * `_components/route-detail-client.tsx` sobre por que `useParams()` e
 * `dynamic(..., { ssr: false })` na página inteira foram descartados
 * como causa do incidente real de "Server Components render"
 * indeterminístico (nunca a solução — só mascaravam o sintoma).
 */
export default async function RotaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  return <RouteDetailClient routeId={id} />;
}
