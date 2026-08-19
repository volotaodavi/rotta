"use client";

import { ApiError } from "@rotta/api-client";
import { Check, MapPin, Sparkles } from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type {
  CreateStudentInput,
  QuickRegisterSchoolInput,
  School,
  SchoolAdministrativeDependency,
  SchoolShift,
  StudentSex,
} from "@rotta/api-client";

import { useQuickRegisterSchool, useSuggestSchools } from "@/features/schools/hooks/use-schools";
import {
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
  SCHOOL_SHIFT_LABEL,
} from "@/features/schools/labels";
import { useCreateStudent } from "@/features/students/hooks/use-students";
import { useTracedRoute } from "@/features/students/hooks/use-traced-route";
import { STUDENT_SEX_LABEL } from "@/features/students/labels";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { useMyLocation } from "@/hooks/use-my-location";

const QUICK_REGISTER_INITIAL_STATE: QuickRegisterSchoolInput = {
  nomeOficial: "",
  dependenciaAdministrativa: "MUNICIPAL",
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
};

const INITIAL_STATE: CreateStudentInput = {
  nome: "",
  dataNascimento: "",
  sexo: "MASCULINO",
  schoolId: "",
  turno: "MANHA",
  embarqueCep: "",
  embarqueLogradouro: "",
  embarqueNumero: "",
  embarqueBairro: "",
  embarqueCidade: "",
  embarqueEstado: "",
  desembarqueCep: "",
  desembarqueLogradouro: "",
  desembarqueNumero: "",
  desembarqueBairro: "",
  desembarqueCidade: "",
  desembarqueEstado: "",
};

/** Distância legível (m/km) até uma sugestão de escola — `distanciaKm` já vem calculado pelo backend, nunca recalculado aqui. */
function formatarDistanciaKm(distanciaKm: number): string {
  return distanciaKm >= 1 ? `${distanciaKm.toFixed(1)} km` : `${Math.round(distanciaKm * 1000)} m`;
}

/** Legenda curta da rota traçada (distância + tempo estimado, ambos calculados pelo OSRM — nunca inventados no front). */
function formatRouteSummary(
  distanciaMetros: number | null,
  duracaoSegundos: number | null,
): string {
  if (distanciaMetros === null || duracaoSegundos === null) return "Rota traçada até a escola.";
  const distancia =
    distanciaMetros >= 1000
      ? `${(distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(distanciaMetros)} m`;
  const minutos = Math.max(1, Math.round(duracaoSegundos / 60));
  return `Rota traçada até a escola: ${distancia}, cerca de ${minutos} min.`;
}

/**
 * Cadastro de Aluno (briefing "Marketplace" §"CADASTRO DO ALUNO") — o
 * gap descoberto nesta entrega: até agora nenhuma UI (web/mobile/admin)
 * chamava `studentsApi.create`, então esta era, na prática, a única
 * peça que faltava para o Responsável conseguir usar a Rotta do zero.
 * Endereço de desembarque pode ser copiado do de embarque com um clique
 * (caso mais comum: volta pro mesmo endereço que saiu).
 *
 * Escola escolhida por autocomplete tolerante a erro de digitação
 * (`useSuggestSchools`, pedido do usuário: "mesmo escrevendo errado...
 * vai dar uma sugestão de escola baseada no nome e localização") — troca
 * de `useSchoolsList` (substring exato) pra `GET /schools/sugestoes`
 * (distância de edição + proximidade). A "localização do transporte" é
 * a posição aproximada do próprio navegador (`useMyLocation`,
 * `enableHighAccuracy: false`) — pedido do usuário: "podendo ser
 * aproximada ou exata, deixa o agente de IA fazer esse trabalho". Sem
 * permissão de geolocalização, a busca continua funcionando, só sem
 * ordenar por proximidade (nunca bloqueia o cadastro).
 */
export default function NovoAlunoPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createStudent = useCreateStudent();
  // Fluxo "código do transporte + celular" (pedido do usuário), caminho
  // "Continuar" (`/vincular-transporte`) — chega aqui com o pré-cadastro
  // já reivindicado (`preRegistrationId`) e o nome do aluno sugerido,
  // mas EDITÁVEL (nunca travado: se a transportadora digitou errado, o
  // Responsável ainda corrige o nome aqui mesmo, sem precisar voltar).
  // Ausente (cadastro direto, sem passar por `/vincular-transporte`) =
  // exatamente o comportamento de antes desta funcionalidade existir.
  const preRegistrationId = searchParams.get("preRegistrationId") ?? undefined;
  const nomeSugerido = searchParams.get("nomeAluno") ?? "";
  const [form, setForm] = useState<CreateStudentInput>({
    ...INITIAL_STATE,
    nome: nomeSugerido,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mesmoEndereco, setMesmoEndereco] = useState(true);

  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const minhaLocalizacao = useMyLocation(schoolSearch.trim().length >= 2);
  const { data: schoolResults, isLoading: isSearchingSchools } = useSuggestSchools({
    q: schoolSearch,
    latitude: minhaLocalizacao.location?.latitude,
    longitude: minhaLocalizacao.location?.longitude,
    limit: 5,
  });

  // Autocadastro rápido de escola (pedido do usuário: "não aparece
  // escolas para clicar, nem busca rápida para ver se a escola existe.
  // Se existe agentes de IA, pq eles não estão trabalhando?") — o
  // catálogo compartilhado só se popula em massa pela sincronização
  // nacional do Censo Escolar, que só Admin Rotta dispara sob demanda
  // (`(admin)/escolas`); enquanto isso, ninguém cadastrando o próprio
  // filho agora deveria ficar esperando. A Geocoding AI Agent
  // geocodifica o endereço na hora (`useQuickRegisterSchool`) — a
  // escola nasce `EM_ANALISE` mas já pode ser selecionada aqui mesmo.
  const [quickRegisterAberto, setQuickRegisterAberto] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickRegisterSchoolInput>(
    QUICK_REGISTER_INITIAL_STATE,
  );
  const [quickErrorMessage, setQuickErrorMessage] = useState<string | null>(null);
  const quickCep = useCepLookup();
  const quickRegisterSchool = useQuickRegisterSchool();

  const embarqueCep = useCepLookup();
  const desembarqueCep = useCepLookup();

  // Endereço de embarque, montado só quando os campos obrigatórios já
  // foram preenchidos — `null` antes disso desativa a geocodificação
  // (nunca busca um endereço pela metade). Pedido do usuário em
  // produção: "clicando na escola correspondente ela já aparece no
  // mapa (com um pino), onde ali ele vai ver a rota traçada".
  const embarqueEnderecoCompleto = useMemo(() => {
    const {
      embarqueCep,
      embarqueLogradouro,
      embarqueNumero,
      embarqueBairro,
      embarqueCidade,
      embarqueEstado,
    } = form;
    if (
      !embarqueCep ||
      !embarqueLogradouro ||
      !embarqueNumero ||
      !embarqueBairro ||
      !embarqueCidade ||
      !embarqueEstado
    ) {
      return null;
    }
    return `${embarqueLogradouro}, ${embarqueNumero}, ${embarqueBairro}, ${embarqueCidade}, ${embarqueEstado}, ${embarqueCep}`;
  }, [form]);

  const escolaDestino =
    selectedSchool?.latitude && selectedSchool.longitude
      ? { latitude: selectedSchool.latitude, longitude: selectedSchool.longitude }
      : null;

  const tracedRoute = useTracedRoute(embarqueEnderecoCompleto, escolaDestino);

  function updateField<K extends keyof CreateStudentInput>(
    key: K,
    value: CreateStudentInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleEmbarqueCepBlur(): Promise<void> {
    const address = await embarqueCep.lookup(form.embarqueCep);
    if (!address) return;
    setForm((current) => ({
      ...current,
      embarqueLogradouro: address.endereco || current.embarqueLogradouro,
      embarqueBairro: address.bairro || current.embarqueBairro,
      embarqueCidade: address.cidade || current.embarqueCidade,
      embarqueEstado: address.estado || current.embarqueEstado,
    }));
  }

  async function handleDesembarqueCepBlur(): Promise<void> {
    const address = await desembarqueCep.lookup(form.desembarqueCep);
    if (!address) return;
    setForm((current) => ({
      ...current,
      desembarqueLogradouro: address.endereco || current.desembarqueLogradouro,
      desembarqueBairro: address.bairro || current.desembarqueBairro,
      desembarqueCidade: address.cidade || current.desembarqueCidade,
      desembarqueEstado: address.estado || current.desembarqueEstado,
    }));
  }

  function updateQuickField<K extends keyof QuickRegisterSchoolInput>(
    key: K,
    value: QuickRegisterSchoolInput[K],
  ): void {
    setQuickForm((current) => ({ ...current, [key]: value }));
  }

  function openQuickRegister(): void {
    setQuickForm({ ...QUICK_REGISTER_INITIAL_STATE, nomeOficial: schoolSearch });
    setQuickErrorMessage(null);
    setQuickRegisterAberto(true);
  }

  async function handleQuickCepBlur(): Promise<void> {
    const address = await quickCep.lookup(quickForm.cep);
    if (!address) return;
    setQuickForm((current) => ({
      ...current,
      logradouro: address.endereco || current.logradouro,
      bairro: address.bairro || current.bairro,
      cidade: address.cidade || current.cidade,
      estado: address.estado || current.estado,
    }));
  }

  // Sem `FormEvent`/`<form>` própria de propósito — este botão vive
  // dentro do `<form>` grande do cadastro do aluno; um `<form>` aninhado
  // seria HTML inválido, então o clique é tratado como uma ação
  // isolada (`type="button"`, nunca `submit`), sem disparar o envio do
  // formulário do aluno por engano.
  async function handleQuickRegisterSubmit(): Promise<void> {
    setQuickErrorMessage(null);
    try {
      const school = await quickRegisterSchool.mutateAsync(quickForm);
      setSelectedSchool(school);
      updateField("schoolId", school.id);
      setQuickRegisterAberto(false);
      setSchoolSearch("");
      setQuickForm(QUICK_REGISTER_INITIAL_STATE);
    } catch (error) {
      setQuickErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar a escola.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.schoolId) {
      setErrorMessage("Escolha a escola do aluno.");
      return;
    }
    // Coordenada de embarque já geocodificada em segundo plano (pino +
    // rota traçada no mapa acima) — reaproveitada aqui pra salvar de
    // vez `embarqueLatitude`/`embarqueLongitude` (campos que já
    // existiam no schema, mas nenhuma tela preenchia até agora). Nunca
    // bloqueia o cadastro se a geocodificação ainda não terminou ou
    // falhou — os campos continuam `undefined`, exatamente como antes.
    const embarqueCoords = tracedRoute.origem
      ? {
          embarqueLatitude: tracedRoute.origem.latitude,
          embarqueLongitude: tracedRoute.origem.longitude,
        }
      : {};
    const input: CreateStudentInput = mesmoEndereco
      ? {
          ...form,
          ...embarqueCoords,
          desembarqueCep: form.embarqueCep,
          desembarqueLogradouro: form.embarqueLogradouro,
          desembarqueNumero: form.embarqueNumero,
          desembarqueComplemento: form.embarqueComplemento,
          desembarqueBairro: form.embarqueBairro,
          desembarqueCidade: form.embarqueCidade,
          desembarqueEstado: form.embarqueEstado,
          ...(tracedRoute.origem
            ? {
                desembarqueLatitude: tracedRoute.origem.latitude,
                desembarqueLongitude: tracedRoute.origem.longitude,
              }
            : {}),
        }
      : { ...form, ...embarqueCoords };
    if (preRegistrationId) input.preRegistrationId = preRegistrationId;
    try {
      const student = await createStudent.mutateAsync(input);
      // Frente Q (pedido do usuário): a tela de mapa em tela cheia
      // (`De: embarque -> Para: escola`, imagem de referência) fica
      // obrigatória assim que o cadastro termina — antes ia pra ficha
      // do aluno (`/alunos/${id}`), que continua a um clique de
      // distância (botão "Voltar" do próprio mapa).
      router.replace(`/alunos/${student.id}/mapa`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar o aluno.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Typography variant="title">Adicionar aluno</Typography>
      {preRegistrationId ? (
        <Typography variant="bodySmall" color="muted">
          A transportadora já adiantou o nome do aluno pra você: confira e complete o resto do
          cadastro.
        </Typography>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Dados do aluno" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Nome completo" isRequired>
                <Input
                  required
                  value={form.nome}
                  onChange={(event) => updateField("nome", event.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Data de nascimento" isRequired>
              <Input
                required
                type="date"
                value={form.dataNascimento}
                onChange={(event) => updateField("dataNascimento", event.target.value)}
              />
            </FormField>
            <FormField label="Sexo" isRequired>
              <Select
                required
                value={form.sexo}
                onChange={(event) => updateField("sexo", event.target.value as StudentSex)}
              >
                {Object.entries(STUDENT_SEX_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Escola" isRequired helperText="Busque pelo nome da escola">
                {selectedSchool ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-2.5">
                      <Typography variant="bodySmall">
                        {selectedSchool.nomeOficial}, {selectedSchool.cidade}/
                        {selectedSchool.estado}
                      </Typography>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSchool(null);
                          updateField("schoolId", "");
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                    {/*
                      Pedido do usuário em produção: "clicando na escola
                      correspondente ela já aparece no mapa (com um
                      pino), onde ali ele vai ver a rota traçada".
                      `latitude`/`longitude` da escola vêm do Geocoding
                      AI Agent (Rotta Geo Platform) — nem toda escola
                      recém-importada já tem coordenada confirmada, por
                      isso o aviso honesto em vez de um mapa vazio/errado
                      quando faltam. O pino de embarque + a rota traçada
                      (`useTracedRoute`, OSRM via Rotta Geo Engine) só
                      aparecem depois que o endereço de embarque, mais
                      abaixo no formulário, também estiver completo —
                      até lá, o mapa mostra só o pino da escola.
                    */}
                    {selectedSchool.latitude && selectedSchool.longitude ? (
                      <div style={{ height: 260 }} className="overflow-hidden rounded-lg">
                        <RottaMap
                          markers={
                            tracedRoute.origem
                              ? ([
                                  {
                                    id: "embarque",
                                    titulo: "Embarque do aluno",
                                    latitude: tracedRoute.origem.latitude,
                                    longitude: tracedRoute.origem.longitude,
                                  },
                                  {
                                    id: selectedSchool.id,
                                    titulo: selectedSchool.nomeOficial,
                                    latitude: selectedSchool.latitude,
                                    longitude: selectedSchool.longitude,
                                  },
                                ] satisfies RottaMapMarker[])
                              : ([
                                  {
                                    id: selectedSchool.id,
                                    titulo: selectedSchool.nomeOficial,
                                    latitude: selectedSchool.latitude,
                                    longitude: selectedSchool.longitude,
                                  },
                                ] satisfies RottaMapMarker[])
                          }
                          route={tracedRoute.route ?? undefined}
                          initialZoom={15}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3">
                        <MapPin size={16} className="shrink-0 text-text-muted" />
                        <Typography variant="caption" color="muted">
                          Localização desta escola ainda não foi confirmada no mapa.
                        </Typography>
                      </div>
                    )}
                    {selectedSchool.latitude &&
                    selectedSchool.longitude &&
                    embarqueEnderecoCompleto ? (
                      <Typography variant="caption" color="muted">
                        {tracedRoute.isGeocoding || tracedRoute.isRouting
                          ? "Buscando o trajeto até a escola…"
                          : tracedRoute.geocodeFailed
                            ? "Não foi possível localizar o endereço de embarque no mapa. O cadastro continua normalmente."
                            : tracedRoute.routeFailed
                              ? "Não foi possível traçar a rota até a escola agora. O cadastro continua normalmente."
                              : tracedRoute.route
                                ? formatRouteSummary(
                                    tracedRoute.distanciaMetros,
                                    tracedRoute.duracaoSegundos,
                                  )
                                : null}
                      </Typography>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="Nome da escola"
                      value={schoolSearch}
                      onChange={(event) => setSchoolSearch(event.target.value)}
                    />
                    {schoolSearch && schoolResults && schoolResults.items.length > 0 && (
                      <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1">
                        {schoolResults.items.map((school) => (
                          <button
                            key={school.id}
                            type="button"
                            className="group flex items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-surface"
                            onClick={() => {
                              setSelectedSchool(school);
                              updateField("schoolId", school.id);
                              setSchoolSearch("");
                            }}
                          >
                            <span>
                              {school.nomeOficial}, {school.cidade}/{school.estado}
                              {/*
                                Distância até a localização aproximada do
                                navegador — só aparece quando o Responsável
                                permitiu geolocalização E a escola já tem
                                coordenada confirmada; nunca uma estimativa
                                inventada (`distanciaKm` vem calculado pelo
                                backend, `SchoolsService.sugerirEscolas`).
                              */}
                              {school.distanciaKm !== null && school.distanciaKm !== undefined && (
                                <span className="text-text-muted">
                                  {" "}
                                  · {formatarDistanciaKm(school.distanciaKm)}
                                </span>
                              )}
                            </span>
                            <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    )}
                    {schoolSearch &&
                    !isSearchingSchools &&
                    schoolResults &&
                    schoolResults.items.length === 0 ? (
                      <Typography variant="caption" color="muted">
                        Nenhuma escola encontrada com esse nome no catálogo ainda.
                      </Typography>
                    ) : null}
                    {!quickRegisterAberto ? (
                      <button
                        type="button"
                        onClick={openQuickRegister}
                        className="flex items-center gap-2 self-start rounded-md px-1 py-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Sparkles className="h-4 w-4" />
                        Não encontrou a escola? Cadastre agora
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <Typography variant="bodySmall" className="font-semibold">
                            Cadastro rápido de escola
                          </Typography>
                        </div>
                        <Typography variant="caption" color="muted">
                          A escola entra no catálogo da Rotta agora mesmo (com o endereço já
                          localizado no mapa) e fica disponível pra você selecionar na hora. Uma
                          transportadora completa os dados depois.
                        </Typography>
                        <FormField label="Nome da escola" isRequired>
                          <Input
                            required
                            value={quickForm.nomeOficial}
                            onChange={(event) =>
                              updateQuickField("nomeOficial", event.target.value)
                            }
                          />
                        </FormField>
                        <FormField label="Dependência administrativa" isRequired>
                          <Select
                            required
                            value={quickForm.dependenciaAdministrativa}
                            onChange={(event) =>
                              updateQuickField(
                                "dependenciaAdministrativa",
                                event.target.value as SchoolAdministrativeDependency,
                              )
                            }
                          >
                            {Object.entries(SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </Select>
                        </FormField>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField label="CEP" isRequired>
                            <Input
                              required
                              value={quickForm.cep}
                              onChange={(event) => updateQuickField("cep", event.target.value)}
                              onBlur={() => void handleQuickCepBlur()}
                            />
                          </FormField>
                          <FormField label="Logradouro" isRequired>
                            <Input
                              required
                              value={quickForm.logradouro}
                              onChange={(event) =>
                                updateQuickField("logradouro", event.target.value)
                              }
                            />
                          </FormField>
                          <FormField label="Número" isRequired>
                            <Input
                              required
                              value={quickForm.numero}
                              onChange={(event) => updateQuickField("numero", event.target.value)}
                            />
                          </FormField>
                          <FormField label="Bairro" isRequired>
                            <Input
                              required
                              value={quickForm.bairro}
                              onChange={(event) => updateQuickField("bairro", event.target.value)}
                            />
                          </FormField>
                          <FormField label="Cidade" isRequired>
                            <Input
                              required
                              value={quickForm.cidade}
                              onChange={(event) => updateQuickField("cidade", event.target.value)}
                            />
                          </FormField>
                          <FormField label="Estado (UF)" isRequired>
                            <Input
                              required
                              maxLength={2}
                              value={quickForm.estado}
                              onChange={(event) =>
                                updateQuickField("estado", event.target.value.toUpperCase())
                              }
                            />
                          </FormField>
                        </div>
                        {quickErrorMessage && (
                          <Typography variant="bodySmall" color="danger">
                            {quickErrorMessage}
                          </Typography>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isLoading={quickRegisterSchool.isPending}
                            onClick={() => void handleQuickRegisterSubmit()}
                          >
                            Cadastrar e selecionar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuickRegisterAberto(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </FormField>
            </div>
            <FormField label="Turno" isRequired>
              <Select
                required
                value={form.turno}
                onChange={(event) => updateField("turno", event.target.value as SchoolShift)}
              >
                {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Endereço de embarque" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="CEP" isRequired>
              <Input
                required
                value={form.embarqueCep}
                onChange={(event) => updateField("embarqueCep", event.target.value)}
                onBlur={() => void handleEmbarqueCepBlur()}
              />
            </FormField>
            <FormField label="Logradouro" isRequired>
              <Input
                required
                value={form.embarqueLogradouro}
                onChange={(event) => updateField("embarqueLogradouro", event.target.value)}
              />
            </FormField>
            <FormField label="Número" isRequired>
              <Input
                required
                value={form.embarqueNumero}
                onChange={(event) => updateField("embarqueNumero", event.target.value)}
              />
            </FormField>
            <FormField label="Complemento">
              <Input
                value={form.embarqueComplemento ?? ""}
                onChange={(event) => updateField("embarqueComplemento", event.target.value)}
              />
            </FormField>
            <FormField label="Bairro" isRequired>
              <Input
                required
                value={form.embarqueBairro}
                onChange={(event) => updateField("embarqueBairro", event.target.value)}
              />
            </FormField>
            <FormField label="Cidade" isRequired>
              <Input
                required
                value={form.embarqueCidade}
                onChange={(event) => updateField("embarqueCidade", event.target.value)}
              />
            </FormField>
            <FormField label="Estado (UF)" isRequired>
              <Input
                required
                maxLength={2}
                value={form.embarqueEstado}
                onChange={(event) =>
                  updateField("embarqueEstado", event.target.value.toUpperCase())
                }
              />
            </FormField>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header
            title="Endereço de desembarque"
            action={
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={mesmoEndereco}
                  onChange={(event) => setMesmoEndereco(event.target.checked)}
                />
                Mesmo do embarque
              </label>
            }
          />
          {!mesmoEndereco && (
            <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="CEP" isRequired>
                <Input
                  required
                  value={form.desembarqueCep}
                  onChange={(event) => updateField("desembarqueCep", event.target.value)}
                  onBlur={() => void handleDesembarqueCepBlur()}
                />
              </FormField>
              <FormField label="Logradouro" isRequired>
                <Input
                  required
                  value={form.desembarqueLogradouro}
                  onChange={(event) => updateField("desembarqueLogradouro", event.target.value)}
                />
              </FormField>
              <FormField label="Número" isRequired>
                <Input
                  required
                  value={form.desembarqueNumero}
                  onChange={(event) => updateField("desembarqueNumero", event.target.value)}
                />
              </FormField>
              <FormField label="Complemento">
                <Input
                  value={form.desembarqueComplemento ?? ""}
                  onChange={(event) => updateField("desembarqueComplemento", event.target.value)}
                />
              </FormField>
              <FormField label="Bairro" isRequired>
                <Input
                  required
                  value={form.desembarqueBairro}
                  onChange={(event) => updateField("desembarqueBairro", event.target.value)}
                />
              </FormField>
              <FormField label="Cidade" isRequired>
                <Input
                  required
                  value={form.desembarqueCidade}
                  onChange={(event) => updateField("desembarqueCidade", event.target.value)}
                />
              </FormField>
              <FormField label="Estado (UF)" isRequired>
                <Input
                  required
                  maxLength={2}
                  value={form.desembarqueEstado}
                  onChange={(event) =>
                    updateField("desembarqueEstado", event.target.value.toUpperCase())
                  }
                />
              </FormField>
            </Card.Body>
          )}
        </Card>

        <Card>
          <Card.Header title="Informações adicionais (opcional)" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Necessidades especiais">
              <Input
                value={form.necessidadesEspeciais ?? ""}
                onChange={(event) => updateField("necessidadesEspeciais", event.target.value)}
              />
            </FormField>
            <FormField label="Medicamentos">
              <Input
                value={form.medicamentos ?? ""}
                onChange={(event) => updateField("medicamentos", event.target.value)}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Observações">
                <Input
                  value={form.observacoes ?? ""}
                  onChange={(event) => updateField("observacoes", event.target.value)}
                />
              </FormField>
            </div>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={createStudent.isPending}>
              Cadastrar aluno
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
