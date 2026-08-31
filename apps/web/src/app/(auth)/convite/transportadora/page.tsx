"use client";

import { ConviteTransportadoraForm } from "../_components/convite-transportadora-form";

/**
 * Rota própria — mantida por compatibilidade com links já enviados
 * (WhatsApp); a entrada principal agora é a aba "Sou responsável" em
 * `/convite` (Dossiê 26, ver `ConviteTransportadoraForm`).
 */
export default function ConviteTransportadoraPage(): JSX.Element {
  return <ConviteTransportadoraForm />;
}
