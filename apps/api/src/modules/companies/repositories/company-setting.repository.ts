import type { CompanySetting } from "@prisma/client";

export interface CompanySettingEntry {
  chave: string;
  tipo: "string" | "boolean" | "number" | "json";
  valor: string;
}

/** `company_settings` tem RLS por `companyId` (Dossiê 8, Seção 3.2). */
export interface CompanySettingRepository {
  upsertMany(companyId: string, entries: CompanySettingEntry[]): Promise<void>;
  listByCompany(companyId: string): Promise<CompanySetting[]>;
}
