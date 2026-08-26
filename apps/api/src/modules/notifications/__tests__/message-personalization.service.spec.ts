import { MessagePersonalizationService } from "../message-personalization.service";

describe("MessagePersonalizationService", () => {
  const service = new MessagePersonalizationService();

  describe("saudacao", () => {
    it.each([
      [8, "Bom dia, João."],
      [14, "Boa tarde, João."],
      [20, "Boa noite, João."],
    ])("às %sh retorna %s", (hora, esperado) => {
      const agora = new Date(2024, 0, 1, hora, 0, 0);
      expect(service.saudacao("João", agora)).toBe(esperado);
    });
  });

  it("nunca retorna mensagem genérica — todo método interpola o dado real recebido", () => {
    expect(service.viagemIniciada("Gama Transportes").corpo).toContain("Gama Transportes");
    expect(service.viagemEncerrada("Ana", "Pedro").corpo).toContain("Pedro");
    expect(service.alunoEmbarcou("Pedro Henrique").corpo).toContain("Pedro");
    expect(service.alunoDesembarcou("Pedro").corpo).toContain("Pedro");
    expect(service.alunoAusente("Pedro").corpo).toContain("Pedro");
    expect(service.veiculoProximo("Pedro", "07:18").corpo).toContain("07:18");
    expect(service.alunoVezEmbarque("Pedro Henrique").corpo).toContain("Pedro");
    expect(service.alunoVezEmbarque("Pedro Henrique").corpo).not.toContain("Henrique");
    expect(service.alunoVezDesembarque("Pedro Henrique").corpo).toContain("Pedro");
    expect(service.alunoVezDesembarque("Pedro Henrique").corpo).not.toContain("Henrique");
    expect(service.motoristaAlterado("Pedro", "Carlos").corpo).toContain("Carlos");
    expect(service.monitorAlterado("Pedro", "Carla").corpo).toContain("Carla");
    expect(service.veiculoAlterado("Pedro", "ABC1D23").corpo).toContain("ABC1D23");
    expect(service.rotaAlterada("Pedro").corpo).toContain("Pedro");
    expect(service.ocorrencia("Pedro", "Trânsito intenso").corpo).toContain("Trânsito intenso");
    expect(service.emergencia("Colisão leve").corpo).toContain("Colisão leve");
    expect(service.novoContrato("Gama Transportes").corpo).toContain("Gama Transportes");
    expect(service.contratoAssinado("Gama Transportes").corpo).toContain("Gama Transportes");
    expect(service.cnhVencendo("Carlos", 5).corpo).toContain("Carlos");
    expect(service.cnhVencendo("Carlos", 5).corpo).toContain("5");
    expect(service.documentoVencendo("CRLV", 10).corpo).toContain("CRLV");
    expect(service.pagamentoAprovado("R$ 350,00").corpo).toContain("R$ 350,00");
    expect(service.pagamentoRecusado("R$ 350,00").corpo).toContain("R$ 350,00");
    expect(service.pagamentoPendente("R$ 350,00").corpo).toContain("R$ 350,00");
    expect(service.novaEscola("EMEF Ana Souza").corpo).toContain("EMEF Ana Souza");
    expect(service.novoAluno("Pedro").corpo).toContain("Pedro");
    expect(service.novoResponsavel("Maria").corpo).toContain("Maria");
  });

  it("todo método retorna titulo e corpo não vazios", () => {
    const mensagens = [
      service.viagemIniciada("Gama Transportes"),
      service.viagemEncerrada("Ana", "Pedro"),
      service.alunoEmbarcou("Pedro"),
      service.alunoDesembarcou("Pedro"),
      service.alunoAusente("Pedro"),
      service.veiculoProximo("Pedro", "07:18"),
      service.alunoVezEmbarque("Pedro"),
      service.alunoVezDesembarque("Pedro"),
      service.motoristaAlterado("Pedro", "Carlos"),
      service.monitorAlterado("Pedro", "Carla"),
      service.veiculoAlterado("Pedro", "ABC1D23"),
      service.rotaAlterada("Pedro"),
      service.ocorrencia("Pedro", "Trânsito intenso"),
      service.emergencia("Colisão leve"),
      service.novoContrato("Gama Transportes"),
      service.contratoAssinado("Gama Transportes"),
      service.cnhVencendo("Carlos", 5),
      service.documentoVencendo("CRLV", 10),
      service.pagamentoAprovado("R$ 350,00"),
      service.pagamentoRecusado("R$ 350,00"),
      service.pagamentoPendente("R$ 350,00"),
      service.novaEscola("EMEF Ana Souza"),
      service.novoAluno("Pedro"),
      service.novoResponsavel("Maria"),
    ];

    for (const mensagem of mensagens) {
      expect(mensagem.titulo.length).toBeGreaterThan(0);
      expect(mensagem.corpo.length).toBeGreaterThan(0);
    }
  });
});
