import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { ChannelRegistryService } from "../channels/channel-registry.service";

import type { ChannelSender } from "../channels/channel-sender.interface";

function fakeSender(channel: CommunicationChannel): ChannelSender {
  return { channel, send: jest.fn() };
}

describe("ChannelRegistryService", () => {
  it("resolve o sender correto por canal", () => {
    const push = fakeSender(CommunicationChannel.PUSH);
    const whatsapp = fakeSender(CommunicationChannel.WHATSAPP);
    const registry = new ChannelRegistryService([push, whatsapp]);

    expect(registry.getSender(CommunicationChannel.PUSH)).toBe(push);
    expect(registry.getSender(CommunicationChannel.WHATSAPP)).toBe(whatsapp);
  });

  it("lança NotFoundException para um canal sem sender registrado", () => {
    const registry = new ChannelRegistryService([fakeSender(CommunicationChannel.PUSH)]);
    expect(() => registry.getSender(CommunicationChannel.SMS)).toThrow(NotFoundException);
  });
});
