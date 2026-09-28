import { StyleSheet } from "react-native";

/**
 * Os quatro estilos que a tela de Início do Motorista e suas duas
 * famílias de componentes usam em comum (auditoria 26/09/2026, item 4).
 *
 * O `inicio-screen.tsx` tinha uma `StyleSheet` só, de 81 chaves, no pé
 * de um arquivo de 2.5 mil linhas. Ao separar os componentes em
 * arquivos próprios, 77 dessas chaves tinham UM dono claro e foram
 * junto com ele. Estas 4 não têm: são usadas por mais de um arquivo, e
 * duplicá-las seria garantir que um dia divergem.
 */
export const inicioStyles = StyleSheet.create({
  // Identidade do Motorista/Monitor (spec 31/08/2026: "sombras discretas
  // em vez de bordas") — sobrescreve a `borderWidth: 1` padrão de
  // `VehicleCard` (`style` é aplicado por último no array de estilos dele).
  driverCard: { borderRadius: 24, borderWidth: 0 },
  mapCardBodyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  navegarButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  paradaHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
});
