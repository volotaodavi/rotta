"use client";

import { Button, Card, Select, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { Vehicle, VehicleCategory } from "@rotta/api-client";

import {
  useResolveVehicleCategoryReview,
  useVehicleCategoryReviewList,
} from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

/**
 * Uma linha da fila — Select próprio (default = categoria sugerida pela
 * IA) e um único botão que decide sozinho se confirma ou corrige: se o
 * valor escolhido não mudou, o PATCH sai sem `categoria` (confirma a
 * sugestão); se mudou, sai com a `categoria` nova (corrige). Nunca uma
 * tela de detalhe separada — a decisão aqui é pequena o bastante pra
 * caber numa linha (ver plano da Frente AL).
 */
function CategoryReviewRow({ vehicle }: { vehicle: Vehicle }): JSX.Element {
  const [selected, setSelected] = useState<VehicleCategory>(vehicle.categoria);
  const resolve = useResolveVehicleCategoryReview(vehicle.id);

  function handleSave(): void {
    resolve.mutate(selected === vehicle.categoria ? {} : { categoria: selected });
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <Typography variant="body" className="font-semibold">
          {vehicle.placa} — {vehicle.modelo}
          {vehicle.marca ? ` (${vehicle.marca})` : ""}
        </Typography>
        <Typography variant="caption" color="muted">
          Empresa {vehicle.companyId} · {VEHICLE_TYPE_LABEL[vehicle.tipo]} ·{" "}
          {vehicle.capacidadePassageiros} lugares
        </Typography>
        <Typography variant="caption" color="muted">
          IA sugeriu <strong>{VEHICLE_CATEGORY_LABEL[vehicle.categoria]}</strong>
          {vehicle.categoriaConfiancaIa !== null
            ? ` (confiança ${vehicle.categoriaConfiancaIa}%)`
            : ""}
        </Typography>
        {vehicle.categoriaMotivoIa && (
          <Typography variant="caption" color="muted" className="max-w-xl">
            {vehicle.categoriaMotivoIa}
          </Typography>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select
          className="w-full min-w-[160px] sm:w-auto"
          value={selected}
          onChange={(event) => setSelected(event.target.value as VehicleCategory)}
        >
          {Object.entries(VEHICLE_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button variant="primary" size="sm" isLoading={resolve.isPending} onClick={handleSave}>
          {selected === vehicle.categoria ? "Confirmar" : "Salvar correção"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Fila de revisão de categoria sugerida pela IA (Frente AL, Admin Rotta)
 * — pedido do usuário: "os admins da Rotta irão analisar manualmente a
 * situação. Porém, o usuário da Rotta pode continuar usando a
 * plataforma do jeito que foi cadastrado e autorgado pela IA." Por isso
 * esta fila é só uma lista de acompanhamento, nunca um bloqueio: cada
 * veículo listado aqui já está em uso normal na plataforma com a
 * categoria que a IA sugeriu, só aguardando confirmação/correção.
 */
export default function VeiculosRevisaoCategoriaPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading, isError } = useVehicleCategoryReviewList({ page, pageSize });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Revisão de categoria (IA)</Typography>
        <Typography variant="bodySmall" color="muted">
          Veículos cujo tipo/capacidade não deram confiança suficiente pra IA decidir sozinha entre
          Escolar, Fretamento ou Executivo — a empresa já está usando a categoria sugerida
          normalmente; confirme ou corrija quando puder.
        </Typography>
      </div>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <Typography variant="body" color="danger">
              Não foi possível carregar a fila de revisão. Tente novamente.
            </Typography>
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum veículo aguardando revisão de categoria no momento.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((vehicle) => (
              <CategoryReviewRow key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </Card>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <Typography variant="caption" color="muted">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)} — {data.total} veículos
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
