import { CommunicationChannel } from "@prisma/client";

import { InAppChannelSender } from "../channels/in-app-channel.sender";

describe("InAppChannelSender", () => {
  it("entrega sempre imediatamente — a própria linha já é a entrega", async () => {
    const sender = new InAppChannelSender();
    expect(sender.channel).toBe(CommunicationChannel.IN_APP);

    const resultado = await sender.send({ notification: {} as never });
    expect(resultado).toEqual({ provedor: "rotta-inbox", entregueImediatamente: true });
  });
});
