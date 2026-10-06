"use client";

import { Badge, Card, Typography } from "@rotta/ui/web";
import { useEffect, useRef, useState } from "react";

import { situacaoDeHoje } from "../escala";
import { usePulso } from "../hooks/use-pulso";

import type { ResumoDeUmTrabalhador } from "../escritorio-3d/cena";
import type { Cargo } from "../escritorio-3d/planta";

/**
 * O escritório da diretoria, em três dimensões, no painel do Admin
 * Geral.
 *
 * Pedido do fundador em 05/10/2026: "literalmente bonecos em 3D, num
 * escritório, com salas próprias, funcionários próprios, com banheiro,
 * sala do cafezinho... funcionários reais mesmo, com vidas que podem ir
 * até o banheiro, cafezinho, ir até outra sala para falar do assunto
 * adjacente e voltar até a sua sala". E a pergunta junto: dá para fazer
 * de graça? Dá. Three.js é biblioteca aberta, roda no navegador, e não
 * existe serviço externo, conta ou custo nesta tela.
 *
 * ## A regra que mantém isto honesto
 *
 * **Quem aparece é verdade. O que a pessoa faz na sala é leitura.**
 *
 * Um cargo só entra em cena se a escala de hoje disser que ele está em
 * turno, e fim de semana ou feriado esvaziam o andar. O caminho que
 * cada boneco faz lá dentro é encenação para a tela ser legível, e está
 * dito na própria tela, em texto, logo abaixo da cena. Essa frase não é
 * modéstia: é o que impede o painel de virar enfeite no dia em que
 * alguém olhar um boneco no cafezinho e achar que mediu alguma coisa.
 *
 * ## Carregamento
 *
 * A cena é importada sob demanda (`import()` dentro do efeito) porque o
 * Three.js é pesado e o Admin não pode pagar esse custo em toda tela. A
 * importação também não acontece no servidor, o que é obrigatório: a
 * biblioteca toca `window` na construção.
 */
export function Escritorio3D(): JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const [resumo, setResumo] = useState<ResumoDeUmTrabalhador[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const { carga, dados: pulso } = usePulso();
  const cenaViva = useRef<{ definirCargaDaPlataforma(c: number): void } | null>(null);

  const hoje = situacaoDeHoje();
  const emTurno = [...new Set(hoje.turnos.map((turno) => turno.cargo))] as Cargo[];
  const chaveDoDia = emTurno.join(",");

  useEffect(() => {
    const alvo = container.current;
    if (!alvo || emTurno.length === 0) return;

    let viva: { destruir(): void; resumo(): ResumoDeUmTrabalhador[] } | null = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let cancelado = false;

    void (async () => {
      try {
        const { CenaDoEscritorio } = await import("../escritorio-3d/cena");
        if (cancelado || !alvo.isConnected) return;
        const cena = new CenaDoEscritorio(alvo, { emTurno });
        viva = cena;
        cenaViva.current = cena;
        setResumo(cena.resumo());
        intervalo = setInterval(() => setResumo(cena.resumo()), 1200);
      } catch (causa) {
        /*
          WebGL pode simplesmente não existir (máquina antiga, driver
          bloqueado, navegador em modo restrito). A tela diz isso em vez
          de ficar um retângulo preto sem explicação, e o resto da
          página de governança continua funcionando.
        */
        setErro(causa instanceof Error ? causa.message : String(causa));
      }
    })();

    return () => {
      cancelado = true;
      cenaViva.current = null;
      if (intervalo) clearInterval(intervalo);
      viva?.destruir();
    };
    // `chaveDoDia` troca quando a escala do dia muda, e aí a cena é
    // remontada com o elenco certo.
  }, [chaveDoDia]);

  /*
    O pulso chega a cada 20 segundos e muda só o ritmo dos agentes, sem
    reconstruir a cena: remontar o escritório a cada leitura faria todo
    mundo voltar para a mesa e perderia o movimento em curso.
  */
  useEffect(() => {
    cenaViva.current?.definirCargaDaPlataforma(carga);
  }, [carga]);

  if (emTurno.length > 0 && erro === null) {
    return (
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="subtitle">O escritório agora</Typography>
            <div className="flex flex-wrap gap-1">
              {resumo.map((linha) => (
                <Badge key={linha.cargo} variant="info">
                  {linha.cargo}: {linha.atividade}
                </Badge>
              ))}
              {pulso ? (
                <Badge variant={pulso.viagensEmAndamento > 0 ? "success" : "neutral"}>
                  {pulso.viagensEmAndamento > 0
                    ? `${pulso.viagensEmAndamento} viagem(ns) agora`
                    : "nenhuma viagem agora"}
                </Badge>
              ) : null}
            </div>
          </div>

          <div
            ref={container}
            className="h-[460px] w-full overflow-hidden rounded-lg bg-slate-950"
          />

          <Typography variant="caption" color="muted">
            Quem aparece é verdade: só entra em cena o cargo que a escala de hoje coloca em turno, e
            em fim de semana ou feriado o andar fica vazio. O ritmo dos agentes também é verdade:
            ele vem do uso real da plataforma neste minuto
            {pulso
              ? ` (${pulso.posicoesNaUltimaHora} posição(ões) de veículo na última hora, ${pulso.eventosDeAluno24h} embarque(s) em 24h)`
              : ""}
            . O caminho que cada um faz dentro do escritório é leitura, não medição: nenhum agente
            vai mesmo ao cafezinho. Arraste para girar, use a roda para aproximar.
          </Typography>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body className="flex flex-col gap-2">
        <Typography variant="subtitle">O escritório agora</Typography>
        {erro ? (
          <Typography variant="bodySmall" color="muted">
            Não foi possível desenhar a cena em três dimensões neste navegador ({erro}). O restante
            desta página continua valendo: é lá que estão os fatos.
          </Typography>
        ) : (
          <Typography variant="bodySmall" color="muted">
            {hoje.motivoDeFolga ?? "Nenhum cargo em turno hoje"}. O andar está vazio, as luzes
            apagadas, e isso é o retrato correto: ninguém trabalha hoje.
          </Typography>
        )}
      </Card.Body>
    </Card>
  );
}
