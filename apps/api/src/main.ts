import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";

import type { AppConfig } from "./config/app.config";

/**
 * Bootstrap da Core API — Dossie 12 (arquitetura de backend) e
 * Dossie 22/23 (padroes de engenharia). Nenhuma rota de negocio e
 * registrada alem dos 22 modulos vazios (Dossie 13) — esta e a fase de
 * fundacao, nao de implementacao de funcionalidade.
 *
 * Guards, interceptors e o filtro de excecoes globais NAO sao
 * registrados aqui — vivem em `app.module.ts` via tokens `APP_GUARD` /
 * `APP_INTERCEPTOR` / `APP_FILTER`, a unica forma idiomatica do NestJS de
 * registrar um provider global que participa do container de DI (varios
 * deles dependem de outros services injetados, ex. `PrismaService`).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger estruturado (Dossie 12, Secao 10.3) substitui o logger padrao
  // do Nest assim que a aplicacao sobe.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService).get<AppConfig>("app")!;

  // --- Seguranca de borda (Dossie 12, Secao 7.1) ---
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  // --- Prefixo de versionamento de API (Dossie 12, Secao 17.3) ---
  app.setGlobalPrefix(config.apiPrefix);

  // --- Validacao de entrada (Dossie 12, Secao 12) ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- Documentacao viva (OpenAPI/Swagger — Dossie 23, Secao 16.1) ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Rotta — Core API")
    .setDescription("Documentacao gerada automaticamente a partir dos decorators do NestJS.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${config.apiPrefix}/docs`, app, swaggerDocument);

  await app.listen(config.port);
}

void bootstrap();
