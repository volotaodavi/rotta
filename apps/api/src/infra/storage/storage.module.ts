import { Module } from "@nestjs/common";

import { SupabaseStorageService } from "./supabase-storage.service";

/** Infraestrutura de upload de arquivos (Dossiê 16) — Supabase Storage. */
@Module({
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class StorageModule {}
