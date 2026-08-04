import { Injectable } from "@nestjs/common";


import type { DeviceTokenRepository, RegisterDeviceTokenData } from "./device-token.repository";
import type { DeviceToken } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaDeviceTokenRepository implements DeviceTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertByToken(data: RegisterDeviceTokenData): Promise<DeviceToken> {
    return this.prisma.deviceToken.upsert({
      where: { token: data.token },
      create: {
        userId: data.userId,
        token: data.token,
        plataforma: data.plataforma,
      },
      update: {
        userId: data.userId,
        plataforma: data.plataforma,
        ativo: true,
        ultimoUsoEm: new Date(),
      },
    });
  }

  listActiveByUser(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({ where: { userId, ativo: true } });
  }

  async deactivate(token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({ where: { token }, data: { ativo: false } });
  }
}
