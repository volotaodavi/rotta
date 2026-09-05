import { Module } from "@nestjs/common";

import { AdminAccountsController } from "./admin-accounts.controller";
import { AdminAccountsService } from "./admin-accounts.service";

import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AdminAccountsController],
  providers: [AdminAccountsService],
})
export class AdminAccountsModule {}
