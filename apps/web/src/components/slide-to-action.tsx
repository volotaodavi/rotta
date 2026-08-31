"use client";

import { ChevronsRight } from "@rotta/icons";
import { Spinner } from "@rotta/ui/web";
import { useRef, useState } from "react";

/**
 * Botão deslizante ("slide to confirm", padrão Uber/apps de mobilidade
 * — pedido explícito do usuário) — SEM biblioteca de gestos nova
 * (`@use-gesture`/Framer Motion não estão instalados em `apps/web`;
 * evita adicionar dependência só pra isso): Pointer Events nativos do
 * navegador (`onPointerDown/Move/Up`, com `setPointerCapture` pra
 * continuar recebendo o `move` mesmo se o cursor sair do alvo) já
 * cobrem mouse E toque com a mesma API, sem `react-native-*` nem
 * polyfill.
 *
 * Não dispara `onComplete` durante o arrasto — só ao soltar com o polegar
 * tendo passado de ~82% do percurso (spec do Motorista, 31/08/2026 —
 * evita disparo acidental por um toque de leve) — e sempre volta ao
 * início se soltar antes disso. `direction="left"` inverte o sentido do
 * arrasto (útil pra ações "voltar"/RTL futuro) sem duplicar o
 * componente.
 */
export interface SlideToActionProps {
  label: string;
  onComplete: () => void;
  /** Texto mostrado no lugar de `label` assim que o arrasto ultrapassa o limiar de confirmação — feedback imediato antes de `isLoading` chegar (ex. "Iniciando viagem..."). */
  completedLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  direction?: "left" | "right";
  /** Atalho pra `thumbColorClassName="bg-driverDanger"` (ex. finalizar viagem). */
  danger?: boolean;
  /** Classe Tailwind `bg-*` do polegar — `bg-driverPrimary` (iniciar/retomar) por padrão; ignorada se `danger` for `true`. */
  thumbColorClassName?: string;
}

const THUMB_SIZE = 56;
const COMPLETE_THRESHOLD = 0.82;

export function SlideToAction({
  label,
  onComplete,
  completedLabel,
  isLoading = false,
  disabled = false,
  direction = "right",
  danger = false,
  thumbColorClassName = "bg-driverPrimary",
}: SlideToActionProps): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isInteractive = !disabled && !isLoading;

  function maxDrag(): number {
    return (trackRef.current?.clientWidth ?? THUMB_SIZE) - THUMB_SIZE;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (!isInteractive) return;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if (!isDragging || !trackRef.current) return;
    const trackLeft = trackRef.current.getBoundingClientRect().left;
    const trackWidth = trackRef.current.clientWidth;
    const rawX =
      direction === "left"
        ? trackLeft + trackWidth - THUMB_SIZE / 2 - event.clientX
        : event.clientX - trackLeft - THUMB_SIZE / 2;
    setDragX(Math.min(Math.max(rawX, 0), maxDrag()));
  }

  function handlePointerUp(): void {
    if (!isDragging) return;
    setIsDragging(false);
    const max = maxDrag();
    if (max > 0 && dragX / max >= COMPLETE_THRESHOLD) {
      onComplete();
    }
    setDragX(0);
  }

  const max = maxDrag();
  const currentProgress = max > 0 ? dragX / max : 0;
  const showCompletedLabel = completedLabel && currentProgress >= COMPLETE_THRESHOLD;
  const thumbClassName = danger ? "bg-driverDanger" : thumbColorClassName;

  return (
    <div
      ref={trackRef}
      className={`relative h-14 w-full select-none overflow-hidden rounded-full border border-border ${
        isInteractive ? "bg-surface-elevated" : "bg-disabled-bg"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16">
        <span
          className={`text-sm font-semibold ${isInteractive ? "text-text-muted" : "text-disabled-text"}`}
        >
          {showCompletedLabel ? completedLabel : label}
        </span>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          transform: direction === "left" ? `translateX(-${dragX}px)` : `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 200ms ease-out",
          [direction === "left" ? "right" : "left"]: 0,
        }}
        className={`absolute top-0 flex items-center justify-center rounded-full text-white ${thumbClassName} ${
          isInteractive ? "cursor-grab touch-none active:cursor-grabbing" : "opacity-60"
        }`}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <ChevronsRight size={22} className={direction === "left" ? "rotate-180" : undefined} />
        )}
      </div>
    </div>
  );
}
