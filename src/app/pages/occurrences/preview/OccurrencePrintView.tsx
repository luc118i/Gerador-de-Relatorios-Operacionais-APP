import type { Ocorrencia } from "../../../types";

interface Props {
  occurrence: Ocorrencia;
  drivers: { d1: DriverSnap | null; d2: DriverSnap | null };
}

interface DriverSnap {
  position: 1 | 2;
  registry: string;
  name: string;
  base?: string | null;
}

function fmtDateBR(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtToday() {
  return new Date().toLocaleDateString("pt-BR");
}

function buildRelatoHtml(o: Ocorrencia): string {
  const prefixo = o.viagem?.prefixo ?? "—";
  const linha = o.viagem?.linha ? ` (${o.viagem.linha})` : "";
  const dataViagem = fmtDateBR(o.dataViagem);
  const dataEvento = fmtDateBR(o.dataEvento);
  const horario = o.horarioInicial ?? "—";

  const b = (s: string) => `<strong>${s}</strong>`;

  switch (o.typeCode) {
    case "EXCESSO_VELOCIDADE": {
      const vel = o.speedKmh ? `${o.speedKmh} km/h` : "velocidade não informada";
      return (
        `Em viagem realizada pelo veículo ${b(prefixo)}${b(linha)} iniciada no dia ${b(dataEvento)}, ` +
        `identificamos que o motorista excedeu o limite de velocidade pré-estabelecido por diversas vezes. ` +
        `No dia ${b(dataViagem)}, às ${b(horario)} chegou a atingir a velocidade de ${b(vel)}, ` +
        `colocando em perigo não somente a própria integridade física, mas também a dos demais passageiros e usuários da rodovia.` +
        `<br/><br/>` +
        `Essa conduta irresponsável representou um potencial risco de acidente ou colisão, ` +
        `configurando um flagrante de violação das normas de trânsito do CTB e um sério desrespeito à segurança viária.`
      );
    }
    default: {
      const local = o.localParada || "local não informado";
      const horFim = o.horarioFinal && o.horarioFinal !== o.horarioInicial
        ? ` às ${b(o.horarioFinal)}`
        : "";
      return (
        `Em viagem realizada pelo veículo ${b(prefixo)}${b(linha)}, ` +
        `identificamos que o condutor realizou uma parada em ${b(local)}, ` +
        `fora do esquema operacional programado, às ${b(horario)}${horFim}.` +
        `<br/><br/>` +
        `Tal conduta caracteriza descumprimento operacional, em desacordo com as normas estabelecidas pela empresa.`
      );
    }
  }
}

export function OccurrencePrintView({ occurrence, drivers }: Props) {
  const isGenerico = occurrence.typeCode === "GENERICO";

  const driversLine = [drivers.d1, drivers.d2]
    .filter(Boolean)
    .map((d) => [d!.registry, d!.name, d!.base].filter(Boolean).join(" — "))
    .join("\n") || "—";

  const occurrenceTitle =
    isGenerico
      ? occurrence.reportTitle || occurrence.typeTitle || "GENÉRICO"
      : occurrence.typeTitle || occurrence.typeCode || "OCORRÊNCIA";

  const relatoHtml = isGenerico
    ? occurrence.relatoHtml ?? ""
    : buildRelatoHtml(occurrence);

  const evidencias = (occurrence.evidencias ?? []).filter((e) => e.url);

  return (
    <div className="print-only" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#111", lineHeight: 1.4 }}>

        {/* ── Cabeçalho ───────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "13pt", letterSpacing: "0.5px" }}>KANDANGO</div>
            <div style={{ fontSize: "7.5pt", color: "#555" }}>TRANSPORTE E TURISMO LTDA</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", fontSize: "12pt", letterSpacing: "1px" }}>RELATÓRIO DE OCORRÊNCIA</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "8pt", color: "#555" }}>
            {fmtToday()}
          </div>
        </div>

        {/* ── Tabela meta ─────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", fontSize: "9pt" }}>
          <tbody>
            <MetaRow label="Linha" value={occurrence.viagem?.linha || "—"} />
            <MetaRow label="Veículo" value={occurrence.viagem?.prefixo || "—"} />
            <MetaRow label="Motorista" value={driversLine} />
            <MetaRow label="Data Relatório" value={fmtToday()} />
            <MetaRow label="Data da viagem" value={fmtDateBR(occurrence.dataEvento)} />
          </tbody>
        </table>

        {/* ── Caixa de ocorrência ─────────────────────────────── */}
        <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "8px 10px", marginBottom: "10px", fontSize: "9pt", background: "#fafafa" }}>
          <div><span style={{ fontWeight: "bold" }}>OCORRÊNCIA:</span> {occurrenceTitle}</div>
          <div><span style={{ fontWeight: "bold" }}>DATA:</span> {fmtDateBR(occurrence.dataViagem)}</div>
          {!isGenerico && (
            <div>
              <span style={{ fontWeight: "bold" }}>Horário do evento:</span>{" "}
              {occurrence.horarioInicial}
              {occurrence.horarioFinal && occurrence.horarioFinal !== occurrence.horarioInicial
                ? ` à ${occurrence.horarioFinal}`
                : ""}
            </div>
          )}
          {isGenerico && occurrence.ccoOperator && (
            <div><span style={{ fontWeight: "bold" }}>Operador CCO:</span> {occurrence.ccoOperator}</div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "10px 0" }} />

        {/* ── Relato ──────────────────────────────────────────── */}
        <div style={{ marginBottom: "14px" }}>
          {isGenerico && (
            <div style={{ fontWeight: "bold", fontSize: "9.5pt", marginBottom: "6px", textTransform: "uppercase" }}>
              Relato da Ocorrência
            </div>
          )}
          <div
            style={{ fontSize: "9.5pt", lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: relatoHtml }}
          />
        </div>

        {/* ── Devolutiva (GENERICO) ────────────────────────────── */}
        {isGenerico && occurrence.devolutivaHtml && (
          <div style={{ marginBottom: "14px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            <div style={{ fontWeight: "bold", fontSize: "9.5pt", marginBottom: "6px", textTransform: "uppercase" }}>
              Devolutiva / Solução Adotada
              {occurrence.devolutivaStatus && (
                <span style={{ fontWeight: "normal", fontSize: "8pt", marginLeft: "8px", color: occurrence.devolutivaStatus === "RESOLVIDO" ? "#15803d" : "#b45309" }}>
                  ({occurrence.devolutivaStatus === "RESOLVIDO" ? "Resolvido" : "Em Andamento"})
                </span>
              )}
            </div>
            <div
              style={{ fontSize: "9.5pt", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: occurrence.devolutivaHtml }}
            />
          </div>
        )}

        {/* ── Evidências ──────────────────────────────────────── */}
        {evidencias.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontWeight: "bold", fontSize: "9.5pt", textTransform: "uppercase", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginBottom: "10px" }}>
              Evidências ({evidencias.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {evidencias.map((ev) => (
                <div key={ev.id} style={{ breakInside: "avoid" }}>
                  <img
                    src={ev.url}
                    alt={ev.legenda || "Evidência"}
                    style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  {ev.legenda && (
                    <div style={{ fontSize: "7.5pt", color: "#555", marginTop: "3px", textAlign: "center" }}>
                      {ev.legenda}
                    </div>
                  )}
                  {ev.linkUrl && (
                    <div style={{ fontSize: "7.5pt", textAlign: "center", marginTop: "2px" }}>
                      <a href={ev.linkUrl} style={{ color: "#2563eb" }}>{ev.linkTexto || "Acessar evidência"}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Rodapé ──────────────────────────────────────────── */}
        <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "6px", fontSize: "7.5pt", color: "#777", textAlign: "center" }}>
          KANDANGO TRANSPORTE E TURISMO LTDA — CNPJ: 03.233.439/0001-52
        </div>
      </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "3px 8px 3px 0", fontWeight: "bold", whiteSpace: "nowrap", width: "1%", color: "#444" }}>
        {label}:
      </td>
      <td style={{ padding: "3px 0", whiteSpace: "pre-line" }}>{value}</td>
    </tr>
  );
}
