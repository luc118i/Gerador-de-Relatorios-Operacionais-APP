import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Download, FileText, FileWarning, Moon, RotateCw, Sun } from "lucide-react";
import { occurrenceSharesApi, type PublicOccurrence } from "../../api/occurrenceShares.api";
import { ApiError } from "../../api/http";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
} from "../config/occurrenceWorkflow";
import type { OccurrenceHistoryEntry } from "../../domain/occurrences";
import { fmtDateBR, fmtDateTime } from "../pages/central-ocorrencias/ficha/fichaHelpers";
import { FichaEvidencias } from "../pages/central-ocorrencias/ficha/FichaEvidencias";
import { FichaTimeline } from "../pages/central-ocorrencias/ficha/FichaTimeline";

const H2 = "text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500";
const LABEL = "text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500";
const PANEL =
  "rounded-lg border border-gray-200/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40";

function Cell({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={className}>
      <p className={LABEL}>{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200/70 pt-8 first:border-t-0 first:pt-0 dark:border-gray-800">
      <h2 className={H2}>{title}</h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

const isRevoked = (err: unknown) => err instanceof ApiError && err.status === 404;

type Theme = "light" | "dark";
const THEME_KEY = "pub-doc-theme";

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function PublicOccurrenceView({ token }: { token: string }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const q = useQuery({
    queryKey: ["public-occurrence", token],
    queryFn: () => occurrenceSharesApi.getPublic(token),
    retry: (count, err) => !isRevoked(err) && count < 4,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
  });

  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });

  // Aplica o tema escolhido no <html> e restaura o estado original ao sair.
  useEffect(() => {
    const el = document.documentElement;
    const prevDark = el.classList.contains("dark");
    const prevTheme = el.getAttribute("data-theme");
    el.classList.toggle("dark", theme === "dark");
    el.setAttribute("data-theme", theme);
    return () => {
      el.classList.toggle("dark", prevDark);
      if (prevTheme === null) el.removeAttribute("data-theme");
      else el.setAttribute("data-theme", prevTheme);
    };
  }, [theme]);

  const relatorioUrl = q.data?.relatorioUrl ?? null;

  // "Gerar PDF" = impressão do navegador. Força o tema claro só durante o diálogo.
  const gerarPdf = () => {
    const el = document.documentElement;
    const wasDark = el.classList.contains("dark");
    if (wasDark) el.classList.remove("dark");
    window.print();
    if (wasDark) el.classList.add("dark");
  };

  return (
    <div
      className="min-h-screen bg-[#f4f5f7] py-4 text-gray-900 sm:py-10 dark:bg-gray-950 dark:text-gray-100"
      style={{ colorScheme: theme }}
    >
      <style>{`@media print {
        .no-print { display: none !important; }
        html.dark { color-scheme: light; }
      }`}</style>
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="no-print mb-3 flex items-center justify-end gap-2">
          {relatorioUrl && (
            <a
              href={relatorioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FileText className="h-3.5 w-3.5" />
              Abrir relatório (PDF)
            </a>
          )}
          <button
            type="button"
            onClick={gerarPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {q.isLoading || q.isFetching ? (
          <p className="py-24 text-center text-sm text-gray-400">Carregando documento…</p>
        ) : q.isError && isRevoked(q.error) ? (
          <Fallback
            title="Link inválido ou revogado"
            sub="Este link de compartilhamento não está mais ativo."
          />
        ) : q.isError || !q.data ? (
          <Fallback
            title="Não foi possível carregar o documento"
            sub="Verifique sua conexão e tente novamente."
            onRetry={() => q.refetch()}
          />
        ) : (
          <Doc data={q.data} />
        )}
      </div>
    </div>
  );
}

function Fallback({ title, sub, onRetry }: { title: string; sub: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <FileWarning className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mx-auto mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function Doc({ data: d }: { data: PublicOccurrence }) {
  const statusCfg = getWorkflowStatusConfig(d.status.code);
  const prioCfg = getPrioridadeConfig(d.prioridade.code);
  const tratada = d.status.code === "TRATADA";

  const motoristas = d.viagem?.motoristas ?? null;
  const prefixo = d.veiculo?.prefixo ?? null;
  const operador = d.resumo?.operadorCco ?? null;

  const timelineEntries = d.timeline?.map((h, i) => ({
    id: String(i),
    createdAt: h.at,
    actorUserId: null,
    actorNome: null,
    action: h.action,
    fromValue: h.fromValue,
    toValue: h.toValue,
    note: h.note,
  })) as unknown as OccurrenceHistoryEntry[] | undefined;

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* faixa de identificação do documento */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/70 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-900/60 sm:px-8">
        <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Ficha de Ocorrência
        </span>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {/* Cabeçalho da ocorrência */}
        <header className="border-b border-gray-200/70 pb-6 dark:border-gray-800">
          <h1 className="text-[1.6rem] font-semibold leading-[1.15] tracking-tight text-gray-900 dark:text-gray-50 sm:text-[1.95rem]">
            {d.titulo}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px]">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
              {d.status.label}
            </span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioCfg.dot}`} />
              Gravidade {d.prioridade.label.toLowerCase()}
            </span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="tabular-nums text-gray-500 dark:text-gray-400">
              {fmtDateBR(d.eventDate)}
              {d.hora ? ` · ${d.hora}` : ""}
            </span>
            {d.tipo && (
              <>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-gray-500 dark:text-gray-400">{d.tipo}</span>
              </>
            )}
          </div>
          <p className="mt-2 font-mono text-[11px] text-gray-400 dark:text-gray-600">#{d.code}</p>
        </header>

        {/* main + sidebar */}
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_248px]">
          {/* Coluna principal */}
          <div className="order-first min-w-0 space-y-8 lg:order-1">
            {d.resumo && (
              <Sec title="Resumo">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                  <Cell
                    label="Situação"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        {tratada && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        {d.resumo.situacao}
                      </span>
                    }
                  />
                  <Cell label="Local" value={d.resumo.local} />
                  <Cell label="Operador CCO" value={d.resumo.operadorCco} />
                </div>
              </Sec>
            )}

            {d.viagem && (d.viagem.linha || motoristas || prefixo) && (
              <Sec title="Dados da viagem">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  <Cell
                    label="Linha"
                    value={d.viagem.linha}
                    className="col-span-2 sm:col-span-2 lg:col-span-2"
                  />
                  <Cell label="Sentido" value={d.viagem.sentido} />
                  <Cell label="Prefixo" value={prefixo} />
                  {motoristas?.map((m, i) => (
                    <Cell
                      key={i}
                      label={i === 0 ? "Motorista" : `Motorista ${i + 1}`}
                      value={`${m.matricula ? m.matricula + " · " : ""}${m.nome}`}
                    />
                  ))}
                  {d.veiculo?.km ? <Cell label="KM" value={`${d.veiculo.km} km`} /> : null}
                </div>
              </Sec>
            )}

            {d.relato && (d.relato.relatoHtml || d.relato.devolutivaHtml) && (
              <Sec title="Relato">
                {d.relato.relatoHtml && (
                  <div
                    className="prose prose-sm max-w-none text-justify text-[15px] leading-[1.75] text-gray-800 [&_p]:my-3 dark:prose-invert dark:text-gray-200"
                    dangerouslySetInnerHTML={{ __html: d.relato.relatoHtml }}
                  />
                )}
                {d.relato.devolutivaHtml && (
                  <div className={`mt-5 ${PANEL}`}>
                    <p className={LABEL}>
                      Devolutiva
                      {d.relato.devolutivaStatus ? ` · ${d.relato.devolutivaStatus}` : ""}
                    </p>
                    <div
                      className="prose prose-sm mt-2 max-w-none text-justify text-gray-700 [&_p]:my-2.5 dark:prose-invert dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: d.relato.devolutivaHtml }}
                    />
                  </div>
                )}
              </Sec>
            )}

            {d.evidencias && d.evidencias.length > 0 && (
              <div className="border-t border-gray-200/70 pt-8 first:border-t-0 first:pt-0 dark:border-gray-800">
                <FichaEvidencias
                  loading={false}
                  evidences={d.evidencias.map((e, i) => ({
                    id: String(i),
                    url: e.kind === "link" ? "" : e.url,
                    caption: e.caption,
                    linkTexto: e.kind === "link" ? e.caption : "",
                    linkUrl: e.kind === "link" ? e.url : "",
                  }))}
                />
              </div>
            )}

            {d.tratativa &&
              (d.tratativa.responsavel || d.tratativa.tipo || d.tratativa.encerrada) && (
                <section className="border-t border-gray-200/70 pt-8 first:border-t-0 first:pt-0 dark:border-gray-800">
                  <h2 className={H2}>Tratativa</h2>
                  <div className={`mt-3.5 ${PANEL}`}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                      <Cell
                        label="Situação atual"
                        value={d.tratativa.encerrada ? "Encerrada" : "Em acompanhamento"}
                      />
                      <Cell label="Responsável" value={d.tratativa.responsavel} />
                      <Cell label="Ação" value={d.tratativa.tipo} />
                      {d.tratativa.suspensao && (
                        <Cell
                          label="Suspensão"
                          value={`${d.tratativa.suspensao.dias} dia(s) · a partir de ${fmtDateBR(
                            d.tratativa.suspensao.dataInicio,
                          )}`}
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

            {timelineEntries && timelineEntries.length > 0 && (
              <section className="border-t border-gray-200/70 pt-8 first:border-t-0 first:pt-0 dark:border-gray-800">
                <h2 className={H2}>Histórico da ocorrência</h2>
                <div className="mt-3.5">
                  <FichaTimeline bare entries={timelineEntries} loading={false} />
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — consulta rápida */}
          <aside className="order-last lg:order-2 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-gray-200/70 lg:pl-6 dark:lg:border-gray-800">
            <h2 className={H2}>Resumo da ocorrência</h2>
            <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-4 lg:flex-col lg:gap-y-5">
              <div>
                <p className={LABEL}>Status</p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}
                >
                  {tratada && <Check className="h-3 w-3" />}
                  {d.status.label}
                </span>
              </div>
              <div>
                <p className={LABEL}>Gravidade</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className={`inline-block h-2 w-2 rounded-full ${prioCfg.dot}`} />
                  {d.prioridade.label}
                </p>
              </div>
              <Cell label="Prefixo" value={prefixo} />
              <Cell
                label="Motorista"
                value={
                  motoristas?.[0]
                    ? `${motoristas[0].matricula ? motoristas[0].matricula + " · " : ""}${motoristas[0].nome}`
                    : null
                }
              />
              <Cell label="Operador" value={operador} />
            </dl>
          </aside>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50/70 px-5 py-4 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500 sm:px-8">
        Documento gerado em {fmtDateTime(d.geradoEm)} · válido enquanto o link estiver ativo.
      </div>
    </article>
  );
}
