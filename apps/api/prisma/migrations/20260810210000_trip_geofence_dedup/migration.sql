-- Prompt "Rotta Geo Platform"/"Communication Engine" — geofencing real:
-- dedup do aviso de aproximacao (VEICULO_PROXIMO) por parada pendente,
-- para nao reavisar a cada novo ping de GPS dentro do mesmo raio.
ALTER TABLE "trips" ADD COLUMN "ultimaParadaProximaNotificadaId" UUID;
