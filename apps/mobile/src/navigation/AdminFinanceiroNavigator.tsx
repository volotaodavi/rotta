import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AdminFinanceiroStackParamList } from "./types";

import {
  AdminFinanceiroCobrancaPixScreen,
  AdminFinanceiroEmpresaScreen,
  AdminFinanceiroExtratoScreen,
  AdminFinanceiroOverviewScreen,
  AdminFinanceiroTransferenciaScreen,
} from "@/features/admin/screens";

const Stack = createNativeStackNavigator<AdminFinanceiroStackParamList>();

/**
 * Stack do Financeiro completo do Admin no app (pedido do usuário
 * 05/09/2026: "pode adicionar o financeiro completo para admins no
 * app") — mesmo papel de aninhamento das demais stacks do Admin.
 * Montada só quando `AdminNavigator` decide mostrar a aba "Financeiro"
 * (sub-papel GERAL/FINANCEIRO) — ver `AdminNavigator.tsx`.
 */
export function AdminFinanceiroNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="Overview"
        component={AdminFinanceiroOverviewScreen}
        options={{ title: "Financeiro" }}
      />
      <Stack.Screen
        name="Extrato"
        component={AdminFinanceiroExtratoScreen}
        options={{ title: "Extrato" }}
      />
      <Stack.Screen
        name="Transferencia"
        component={AdminFinanceiroTransferenciaScreen}
        options={{ title: "Transferência Pix" }}
      />
      <Stack.Screen
        name="CobrancaPix"
        component={AdminFinanceiroCobrancaPixScreen}
        options={{ title: "Cobrança Pix" }}
      />
      <Stack.Screen
        name="Empresa"
        component={AdminFinanceiroEmpresaScreen}
        options={({ route }) => ({ title: route.params.companyNome })}
      />
    </Stack.Navigator>
  );
}
