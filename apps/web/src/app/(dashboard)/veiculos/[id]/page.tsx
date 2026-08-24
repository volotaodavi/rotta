import { VehicleDetailClient } from "./vehicle-detail-client";

/**
 * Server Component mínimo — só resolve `params` (Promise, contrato do
 * App Router) com `await` e repassa o valor final (`string`) pro
 * Client Component. Ver a nota completa em `vehicle-detail-client.tsx`
 * sobre por que `use(params)` dentro de um Client Component foi
 * descartado.
 */
export default async function VeiculoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  return <VehicleDetailClient vehicleId={id} />;
}
