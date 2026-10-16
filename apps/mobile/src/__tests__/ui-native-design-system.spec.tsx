import { lightTheme } from "@rotta/theme";
import {
  AppHeader,
  EmptyState,
  FilterTabs,
  PersonRow,
  SectionHeader,
  StatusPill,
} from "@rotta/ui/native";
import { fireEvent, render, screen } from "@testing-library/react-native";

/**
 * A primeira camada de componentes compartilhados do app nativo.
 *
 * ## Por que estes testes existem
 *
 * Em 16/10/2026 o app tinha 94 telas e `@rotta/ui/native` exportava
 * DOIS componentes. Cada tela desenhava o próprio cabeçalho, a própria
 * linha de lista e a própria etiqueta de estado, o que é a causa
 * mecânica de o aplicativo parecer montado por pessoas diferentes. Os
 * tokens de `@rotta/theme` já estavam certos; faltava a camada que os
 * aplica do mesmo jeito em toda parte.
 *
 * O que estes testes prendem não é aparência, que muda, e sim as três
 * regras que, quebradas, voltam a espalhar inconsistência e mentira:
 * o tom da etiqueta vem do estado e não do gosto da tela, a ação só
 * aparece quando existe destino, e a contagem do filtro mostra o número
 * que lhe foi dado.
 */

const theme = lightTheme;

describe("StatusPill", () => {
  it("usa o fundo suave da cor semântica, nunca a cor cheia", () => {
    /*
      Fundo cheio com texto claro é botão. Etiqueta de estado usa o
      fundo suave: ela informa, não convida ao toque, e numa lista com
      dez linhas dez botões coloridos competem com a ação real da tela.
    */
    render(<StatusPill label="Embarcado" tone="success" theme={theme} />);

    const pill = screen.getByLabelText("Embarcado");
    expect(pill).toBeTruthy();
    const estilo = Array.isArray(pill.props.style)
      ? Object.assign({}, ...pill.props.style.filter(Boolean))
      : pill.props.style;
    expect(estilo.backgroundColor).toBe(theme.colors.successMuted);
    expect(estilo.backgroundColor).not.toBe(theme.colors.success);
  });

  it("cada tom tem fundo próprio, para dois estados nunca ficarem iguais", () => {
    const tons = ["success", "warning", "danger", "info", "neutral"] as const;
    const fundos = tons.map((tone) => {
      const { unmount } = render(<StatusPill label={tone} tone={tone} theme={theme} />);
      const pill = screen.getByLabelText(tone);
      const estilo = Array.isArray(pill.props.style)
        ? Object.assign({}, ...pill.props.style.filter(Boolean))
        : pill.props.style;
      unmount();
      return estilo.backgroundColor as string;
    });

    expect(new Set(fundos).size).toBe(tons.length);
  });
});

describe("SectionHeader", () => {
  it("não desenha ação quando não há destino", () => {
    /*
      "Ver todas" que não leva a lugar nenhum é a forma mais fácil de
      um app parecer quebrado: a pessoa toca e nada acontece.
    */
    render(<SectionHeader title="Movimentações" theme={theme} />);

    expect(screen.getByText("Movimentações")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("chama a ação quando ela existe", () => {
    const aoTocar = jest.fn();
    render(
      <SectionHeader title="Faturas" actionLabel="Ver todas" onAction={aoTocar} theme={theme} />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Ver todas" }));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });
});

describe("EmptyState", () => {
  it("mostra o fato e o que fazer, e só desenha botão com ação", () => {
    render(
      <EmptyState
        title="Nenhuma viagem hoje"
        description="A última viagem foi em 28/08/2026."
        theme={theme}
      />,
    );

    expect(screen.getByText("Nenhuma viagem hoje")).toBeTruthy();
    expect(screen.getByText("A última viagem foi em 28/08/2026.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("FilterTabs", () => {
  it("marca como selecionado só o filtro ativo", () => {
    render(
      <FilterTabs
        options={[
          { key: "todos", label: "Todos", count: 16 },
          { key: "embarcados", label: "Embarcados", count: 12 },
        ]}
        value="todos"
        onChange={jest.fn()}
        theme={theme}
      />,
    );

    expect(screen.getByLabelText("Todos, 16").props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText("Embarcados, 12").props.accessibilityState.selected).toBe(false);
  });

  it("mostra a contagem que recebeu, e omite quando não recebe", () => {
    /*
      Contagem inventada é pior que contagem ausente: a pessoa toca em
      "Embarcados 12" e encontra nove.
    */
    render(
      <FilterTabs
        options={[
          { key: "a", label: "Semana" },
          { key: "b", label: "Aguardando", count: 3 },
        ]}
        value="a"
        onChange={jest.fn()}
        theme={theme}
      />,
    );

    expect(screen.getByLabelText("Semana")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("troca de filtro ao tocar", () => {
    const aoTrocar = jest.fn();
    render(
      <FilterTabs
        options={[
          { key: "hoje", label: "Hoje" },
          { key: "mes", label: "Mês" },
        ]}
        value="hoje"
        onChange={aoTrocar}
        theme={theme}
      />,
    );

    fireEvent.press(screen.getByLabelText("Mês"));
    expect(aoTrocar).toHaveBeenCalledWith("mes");
  });
});

describe("PersonRow", () => {
  it("mostra iniciais quando não há foto, porque rosto de criança não se inventa", () => {
    render(<PersonRow nome="Ana Clara Santos" subtitulo="Escola Municipal" theme={theme} />);

    expect(screen.getByText("AS")).toBeTruthy();
    expect(screen.getByText("Ana Clara Santos")).toBeTruthy();
  });

  it("usa uma letra só quando a pessoa tem um nome só", () => {
    render(<PersonRow nome="Bruno" theme={theme} />);
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("leva estado e horário juntos, que é como a lista é lida", () => {
    render(
      <PersonRow
        nome="Carla Mendes"
        status={{ label: "Embarcado", tone: "success" }}
        horario="07:12"
        theme={theme}
      />,
    );

    expect(screen.getByLabelText("Embarcado")).toBeTruthy();
    expect(screen.getByText("07:12")).toBeTruthy();
  });
});

describe("AppHeader", () => {
  it("não desenha bolinha quando não há aviso", () => {
    /*
      Ponto vermelho permanente ensina a pessoa a ignorar o ponto
      vermelho, e aí o aviso que importa some junto.
    */
    render(<AppHeader titulo="Rotta" avisos={0} onAbrirAvisos={jest.fn()} theme={theme} />);

    expect(screen.getByLabelText("Notificações")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("acima de 99 mostra 99+, porque três dígitos viram borrão", () => {
    render(<AppHeader titulo="Rotta" avisos={128} onAbrirAvisos={jest.fn()} theme={theme} />);

    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByLabelText("Notificações, 99+ não lidas")).toBeTruthy();
  });

  it("só convida a trocar de perfil quando existe para onde trocar", () => {
    /*
      A mesma pessoa pode ser responsável de um aluno e motorista de uma
      transportadora, e as duas telas mostram viagem. Sem saber em qual
      perfil está, ela lê a tela errada achando que é a certa.
    */
    const { rerender } = render(
      <AppHeader titulo="Rotta" perfilAtivo="Responsável" theme={theme} />,
    );
    expect(screen.getByLabelText("Perfil Responsável")).toBeTruthy();

    rerender(
      <AppHeader
        titulo="Rotta"
        perfilAtivo="Transportadora"
        onTrocarPerfil={jest.fn()}
        theme={theme}
      />,
    );
    expect(screen.getByLabelText("Perfil Transportadora, tocar para trocar")).toBeTruthy();
  });
});
