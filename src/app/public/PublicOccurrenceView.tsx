import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileWarning, Link2 } from "lucide-react";
import { occurrenceSharesApi, type PublicOccurrence } from "../../api/occurrenceShares.api";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
} from "../config/occurrenceWorkflow";
import type { OccurrenceHistoryEntry } from "../../domain/occurrences";
import { fmtDateBR, fmtDateTime, historyLine } from "../pages/central-ocorrencias/ficha/fichaHelpers";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200 pt-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PublicOccurrenceView({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ["public-occurrence", token],
    queryFn: () => occurrenceSharesApi.getPublic(token),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-8 text-gray-900 sm:py-12" style={{ colorScheme: "light" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {q.isLoading ? (
          <p className="py-24 text-center text-sm text-gray-400">Carregando documento…</p>
        ) : q.isError || !q.data ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <FileWarning className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">Link inválido ou revogado</p>
            <p className="mt-1 text-xs text-gray-400">
              Este link de compartilhamento não está mais ativo.
            </p>
          </div>
        ) : (
          <Doc data={q.data} />
        )}
      </div>
    </div>
  );
}

function Doc({ data: d }: { data: PublicOccurrence }) {
  const statusCfg = getWorkflowStatusConfig(d.status.code);
  const prioCfg = getPrioridadeConfig(d.prioridade.code);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Cabeçalho do documento */}
      <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Ficha de Ocorrência
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-gray-400">#{d.code}</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-gray-900">
          {d.titulo}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
            {d.status.label}
          </span>
          <span className="flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioCfg.dot}`} />
            {d.prioridade.label}
          </span>
          <span>·</span>
          <span>
            {fmtDateBR(d.eventDate)}
            {d.hora ? ` — ${d.hora}` : ""}
          </span>
          {d.tipo && (
            <>
              <span>·</span>
              <span>{d.tipo}</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        {d.resumo && (
          <Section title="Resumo">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Row label="Situação" value={d.resumo.situacao} />
              <Row label="Local" value={d.resumo.local} />
              <Row label="Operador CCO" value={d.resumo.operadorCco} />
            </div>
          </Section>
        )}

        {d.viagem && (d.viagem.linha || d.viagem.motoristas) && (
          <Section title="Dados da viagem">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Row label="Linha" value={d.viagem.linha} />
              <Row label="Sentido" value={d.viagem.sentido} />
              {d.viagem.motoristas?.map((m, i) => (
                <Row
                  key={i}
                  label={i === 0 ? "Motorista" : `Motorista ${i + 1}`}
                  value={`${m.matricula ? m.matricula + " · " : ""}${m.nome}`}
                />
              ))}
            </div>
          </Section>
        )}

        {d.veiculo && (d.veiculo.prefixo || d.veiculo.km) && (
          <Section title="Veículo">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Row label="Prefixo" value={d.veiculo.prefixo} />
              <Row label="KM" value={d.veiculo.km ? `${d.veiculo.km} km` : null} />
            </div>
          </Section>
        )}

        {d.relato && (d.relato.relatoHtml || d.relato.devolutivaHtml) && (
          <Section title="Relato">
            {d.relato.relatoHtml && (
              <div
                className="prose prose-sm max-w-[68ch] leading-relaxed text-gray-800"
                dangerouslySetInnerHTML={{ __html: d.relato.relatoHtml }}
              />
            )}
            {d.relato.devolutivaHtml && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Devolutiva{d.relato.devolutivaStatus ? ` · ${d.relato.devolutivaStatus}` : ""}
                </p>
                <div
                  className="prose prose-sm mt-2 max-w-[68ch] text-gray-700"
                  dangerouslySetInnerHTML={{ __html: d.relato.devolutivaHtml }}
                />
              </div>
            )}
          </Section>
        )}

        {d.tratativa &&
          (d.tratativa.responsavel || d.tratativa.tipo || d.tratativa.encerrada) && (
            <Section title="Tratativa">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Row label="Responsável" value={d.tratativa.responsavel} />
                <Row label="Tratativa" value={d.tratativa.tipo} />
                {d.tratativa.suspensao && (
                  <Row
                    label="Suspensão"
                    value={`${d.tratativa.suspensao.dias} dia(s) · a partir de ${fmtDateBR(
                      d.tratativa.suspensao.dataInicio,
                    )}`}
                  />
                )}
                <Row
                  label="Situação"
                  value={d.tratativa.encerrada ? "Encerrada" : "Em acompanhamento"}
                />
              </div>
            </Section>
          )}

        {d.timeline && d.timeline.length > 0 && (
          <Section title="Linha do tempo">
            <ol className="space-y-3">
              {d.timeline.map((h, i) => (
                <li key={i} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-sm font-medium text-gray-800">
                    {historyLine(h as unknown as OccurrenceHistoryEntry)}
                  </p>
                  <p className="text-[11px] tabular-nums text-gray-400">{fmtDateTime(h.at)}</p>
                  {h.note && h.action !== "NOTA" && (
                    <p className="mt-0.5 text-xs text-gray-500">{h.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {d.evidencias && d.evidencias.length > 0 && (
          <Section title="Evidências">
            {(() => {
              const imgs = d.evidencias!.filter((e) => e.kind === "image");
              const outros = d.evidencias!.filter((e) => e.kind !== "image");
              return (
                <div className="space-y-3">
                  {imgs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {imgs.map((e, i) => (
                        <a
                          key={i}
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                          title={e.caption || "Abrir imagem"}
                        >
                          <img
                            src={e.url}
                            alt={e.caption || ""}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {outros.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {outros.map((e, i) => (
                        <a
                          key={i}
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {e.kind === "link" ? (
                            <Link2 className="h-3.5 w-3.5" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          {e.caption || (e.kind === "pdf" ? "Documento (PDF)" : "Link")}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </Section>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50/70 px-6 py-4 text-center text-[11px] text-gray-400 sm:px-8">
        Documento gerado em {fmtDateTime(d.geradoEm)} · válido enquanto o link estiver ativo.
      </div>
    </article>
  );
}
