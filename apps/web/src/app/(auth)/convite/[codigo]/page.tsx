import { InviteClient } from "./invite-client";

/**
 * Server Component mínimo — só resolve `params` (Promise, contrato do
 * App Router) com `await` e repassa o valor final (`string`) pro
 * Client Component. Ver a nota completa em `invite-client.tsx` sobre
 * por que `use(params)` dentro de um Client Component foi descartado.
 */
export default async function ResgatarConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<JSX.Element> {
  const { codigo } = await params;
  return <InviteClient codigo={codigo} />;
}
