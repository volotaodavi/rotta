"use client";

import { COMPANY_TYPE_LABEL } from "@rotta/api-client";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Tabs,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { use, useState } from "react";

import { useAccessAsSupport } from "@/features/backoffice/hooks/use-backoffice";
import { CompanyStatusBadge } from "@/features/companies/components/company-status-badge";
import {
  useCompany,
  useCompanyDashboard,
  useReactivateCompany,
  useSuspendCompany,
} from "@/features/companies/hooks/use-companies";
import { CompanyVehiclesTab } from "@/features/vehicles/components/company-vehicles-tab";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Detalhes de uma empresa (tenant) + dashboard operacional — visão do
 * Admin Rotta (Dossiê 16, Seção 5.1/5.6). Combina o que nos personas de
 * empresa seria "Detalhes" + "Dashboard" em uma única tela, já que o
 * Admin Rotta consulta isso pontualmente (suporte/auditoria), não como
 * rotina diária de operação.
 */
export default function EmpresaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const { data: company, isLoading, isError } = useCompany(id);
  const { data: dashboard } = useCompanyDashboard(id);
  const suspend = useSuspendCompany(id);
  const reactivate = useReactivateCompany(id);
  const accessAsSupport = useAccessAsSupport();
  const [motivo, setMotivo] = useState("");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportMotivo, setSupportMotivo] = useState("");
  const [supportError, setSupportError] = useState("");
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendMotivo, setSuspendMotivo] = useState(motivo);
  const [activeTab, setActiveTab] = useState<"dados" | "veiculos">("dados");

  function handleConfirmarAcessoSuporte(): void {
    if (supportMotivo.trim().length < 10) {
      setSupportError("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    accessAsSupport.mutate({ companyId: id, motivo: supportMotivo });
    setSupportModalOpen(false);
    setSupportMotivo("");
    setSupportError("");
  }

  function handleConfirmarSuspensao(): void {
    if (!suspendMotivo.trim()) return;
    setMotivo(suspendMotivo);
    suspend.mutate(suspendMotivo);
    setSuspendModalOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar esta empresa.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Typography variant="title">{company.nomeFantasia}</Typography>
            <CompanyStatusBadge status={company.status} />
          </div>
          <Typography variant="caption" color="muted">
            {company.razaoSocial} · {company.cpfCnpj}
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            isLoading={accessAsSupport.isPending}
            onClick={() => setSupportModalOpen(true)}
          >
            Acessar como suporte
          </Button>
          <Link
            href={`/empresas/${id}/editar`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Editar
          </Link>
          {company.status === "SUSPENSO" ? (
            <Button
              variant="primary"
              isLoading={reactivate.isPending}
              onClick={() => reactivate.mutate()}
            >
              Reativar
            </Button>
          ) : (
            <Button
              variant="danger"
              isLoading={suspend.isPending}
              onClick={() => {
                setSuspendMotivo(motivo);
                setSuspendModalOpen(true);
              }}
            >
              Suspender
            </Button>
          )}
        </div>
      </div>

      <Modal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)}>
        <Modal.Header onClose={() => setSupportModalOpen(false)}>Acessar como suporte</Modal.Header>
        <Modal.Body className="flex flex-col gap-3">
          <Typography variant="bodySmall" color="muted">
            Este acesso será registrado em log de auditoria com sua justificativa (ADM-01/RN-10).
          </Typography>
          <Input
            placeholder="Motivo (mínimo 10 caracteres)"
            value={supportMotivo}
            onChange={(event) => {
              setSupportMotivo(event.target.value);
              setSupportError("");
            }}
          />
          {supportError && (
            <Typography variant="caption" color="danger">
              {supportError}
            </Typography>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setSupportModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmarAcessoSuporte}>Confirmar</Button>
        </Modal.Footer>
      </Modal>

      <Modal isOpen={suspendModalOpen} onClose={() => setSuspendModalOpen(false)}>
        <Modal.Header onClose={() => setSuspendModalOpen(false)}>Suspender empresa</Modal.Header>
        <Modal.Body>
          <Input
            placeholder="Motivo da suspensão"
            value={suspendMotivo}
            onChange={(event) => setSuspendMotivo(event.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setSuspendModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmarSuspensao}>
            Suspender
          </Button>
        </Modal.Footer>
      </Modal>

      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Motoristas", value: dashboard.motoristas },
            { label: "Responsáveis", value: dashboard.responsaveis },
            { label: "Alunos", value: dashboard.alunos },
            { label: "Veículos", value: dashboard.veiculos },
            { label: "Rotas", value: dashboard.rotas },
            { label: "Viagens", value: dashboard.viagens },
          ].map((metric) => (
            <Card key={metric.label}>
              <Card.Body className="flex flex-col gap-1">
                <Typography variant="caption" color="muted">
                  {metric.label}
                </Typography>
                <Typography variant="subtitle">{metric.value}</Typography>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {dashboard && dashboard.alertas.length > 0 && (
        <Card>
          <Card.Header title="Alertas" />
          <Card.Body className="flex flex-col gap-2">
            {dashboard.alertas.map((alerta) => (
              <Typography key={alerta} variant="bodySmall" color="danger">
                {alerta}
              </Typography>
            ))}
          </Card.Body>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: "dados", label: "Dados da empresa" },
          { id: "veiculos", label: "Veículos" },
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as "dados" | "veiculos")}
      />

      {activeTab === "dados" ? (
        <Card>
          <Card.Header
            title="Dados da empresa"
            action={<Badge variant="neutral">{company.plan.name}</Badge>}
          />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoItem label="Email" value={company.email} />
            <InfoItem label="Telefone" value={company.telefone} />
            <InfoItem label="WhatsApp" value={company.whatsapp ?? "Não informado"} />
            <InfoItem label="Tipo" value={COMPANY_TYPE_LABEL[company.tipo]} />
            <InfoItem
              label="Endereço"
              value={`${company.endereco}, ${company.numero}${company.complemento ? `, ${company.complemento}` : ""}`}
            />
            <InfoItem
              label="Bairro/Cidade"
              value={`${company.bairro}, ${company.cidade}/${company.estado}`}
            />
            <InfoItem label="CEP" value={company.cep} />
            {dashboard && (
              <InfoItem
                label="Receita estimada"
                value={centsToBRL(dashboard.receitaEstimadaCentavos)}
              />
            )}
          </Card.Body>
        </Card>
      ) : (
        <CompanyVehiclesTab companyId={id} />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </div>
  );
}
