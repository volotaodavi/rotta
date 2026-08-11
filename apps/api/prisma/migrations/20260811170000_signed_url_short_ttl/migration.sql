-- Dossiê 45 — achado C3 da auditoria de consistência Legal↔Produto:
-- SupabaseStorageService assinava URLs de documentos/fotos privados com
-- validade de 10 anos, contrariando a promessa de "curto período" em
-- /legal/seguranca. Novas colunas guardam o CAMINHO do arquivo no
-- bucket (não a URL assinada); a partir de agora o backend assina uma
-- URL nova de curta validade a cada leitura em vez de reusar a URL
-- longa persistida. Linhas antigas (filePath/fotoPath NULL) continuam
-- servindo o fileUrl/fotoUrl de validade longa já gravado, até expirar.
ALTER TABLE "driver_documents" ADD COLUMN "filePath" TEXT;
ALTER TABLE "vehicle_documents" ADD COLUMN "filePath" TEXT;
ALTER TABLE "students" ADD COLUMN "fotoPath" TEXT;
