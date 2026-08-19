import { Module } from "@nestjs/common";

import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { StudentCredentialedListener } from "./listeners/student-credentialed.listener";
import {
  CONTRACT_REPOSITORY,
  RATING_REPOSITORY,
  TRANSPORTER_REPOSITORY,
  TRANSPORT_REQUEST_REPOSITORY,
} from "./marketplace.constants";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { RatingsController } from "./ratings.controller";
import { RatingsService } from "./ratings.service";
import { PrismaContractRepository } from "./repositories/prisma-contract.repository";
import { PrismaRatingRepository } from "./repositories/prisma-rating.repository";
import { PrismaTransportRequestRepository } from "./repositories/prisma-transport-request.repository";
import { PrismaTransporterRepository } from "./repositories/prisma-transporter.repository";
import { TermoCienciaPdfService } from "./termo-ciencia-pdf.service";
import { TransportRequestsController } from "./transport-requests.controller";
import { TransportRequestsService } from "./transport-requests.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { AuthentiqueModule } from "@/modules/authentique/authentique.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { RottaAiModule } from "@/modules/rotta-ai/rotta-ai.module";
import { SchoolsModule } from "@/modules/schools/schools.module";
import { StudentsModule } from "@/modules/students/students.module";
import { UsersModule } from "@/modules/users/users.module";
import { WalletModule } from "@/modules/wallet/wallet.module";

/**
 * Módulo Marketplace (briefing "Marketplace") — descoberta/contratação
 * de transportadores pelo Responsável. Cobre BUSCA (`MarketplaceService`),
 * SOLICITAÇÃO DE TRANSPORTE (`TransportRequestsService`),
 * GERAÇÃO/ASSINATURA/ATIVAÇÃO DE CONTRATO (`ContractsService`, com
 * `AuthentiqueModule` para a preparação do documento e `RottaAiModule`
 * para a validação best-effort pós-assinatura — ambos stubs honestos) e
 * AVALIAÇÕES pós-transporte (`RatingsService`, liberadas 30 dias após a
 * ativação). Um único módulo (nunca vários), já que todos operam sobre
 * `TransportRequest`/`Contract`/`Rating`, modelados juntos no schema
 * Prisma — ver `schema.prisma`, seção "Marketplace". Importa
 * `StudentsModule` para o cadastro inline de aluno na própria
 * solicitação (briefing "SOLICITAR TRANSPORTE") — sem risco de
 * dependência circular, já que `StudentsModule` deliberadamente NÃO
 * importa `MarketplaceModule` de volta (ver nota em `students.module.ts`).
 *
 * Importa `CompaniesModule` (só `CompaniesService.getNomeFantasia`, para
 * compor `nomeEmpresa` nas mensagens do Message Personalization AI) e
 * `MessagePersonalizationModule` (nunca `NotificationsModule` inteiro,
 * ver nota em `notifications.module.ts`) para `MessagePersonalizationService`
 * — `EventEmitter2` (emitir `communication.requested` em `gerarContrato`/
 * `tryActivateAfterBothSigned`, eventos `NOVO_CONTRATO`/
 * `CONTRATO_ASSINADO`) é injetado sem import extra, já global em
 * `AppModule`. Nenhum ciclo, já que `CompaniesModule` não conhece
 * `MarketplaceModule`.
 *
 * Importa também `WalletModule` (Dossiê 26) — `tryActivateAfterBothSigned`
 * chama `WalletService.registrarMensalidadePendente` best-effort na
 * ativação, para a mensalidade do contrato aparecer como crédito
 * pendente na carteira Rotta Pay da empresa.
 *
 * `StudentCredentialedListener` reage a `STUDENT_CREDENTIALED_EVENT`
 * (emitido por `StudentsService.create()` no fluxo "código do
 * transporte + celular") criando a `TransportRequest` já `APROVADA` —
 * fecha o elo que faltava entre esse pré-cadastro e o resto do
 * Marketplace (gerar Contrato, escolher motorista/veículo/mensalidade).
 * Também gera o "termo de ciência" automático (pedido do usuário — ver
 * nota do próprio listener e de `Contract.origem` no schema Prisma).
 *
 * `UsersModule`/`SchoolsModule`: o listener e
 * `ContractsService.gerarPdfTermoCiencia` precisam do nome/CPF do
 * responsável (`UsersService.findById`) e do nome da escola
 * (`SCHOOL_REPOSITORY`, exportado por `SchoolsModule`) pra montar o PDF
 * do termo — nenhum dos dois importa `MarketplaceModule` de volta, sem
 * risco de ciclo.
 */
@Module({
  imports: [
    AuditModule,
    StudentsModule,
    AuthentiqueModule,
    RottaAiModule,
    CompaniesModule,
    MessagePersonalizationModule,
    WalletModule,
    UsersModule,
    SchoolsModule,
  ],
  controllers: [
    MarketplaceController,
    TransportRequestsController,
    ContractsController,
    RatingsController,
  ],
  providers: [
    MarketplaceService,
    TransportRequestsService,
    ContractsService,
    RatingsService,
    StudentCredentialedListener,
    TermoCienciaPdfService,
    { provide: TRANSPORTER_REPOSITORY, useClass: PrismaTransporterRepository },
    { provide: TRANSPORT_REQUEST_REPOSITORY, useClass: PrismaTransportRequestRepository },
    { provide: CONTRACT_REPOSITORY, useClass: PrismaContractRepository },
    { provide: RATING_REPOSITORY, useClass: PrismaRatingRepository },
  ],
  exports: [MarketplaceService, TransportRequestsService, ContractsService, RatingsService],
})
export class MarketplaceModule {}
