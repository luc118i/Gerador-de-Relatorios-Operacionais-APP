// Resolve o link exato de um esquema no app "esquemas-consulta"
// (MODO APRESENTACAO DOS ESQUEMAS) a partir dos dados da viagem de uma
// ocorrência (código da linha, horário, sentido). Esse app não expõe uma
// API de "resolver por critério" — só resolve por ID depois que o slug já
// existe (ver seu EsquemaService.getEsquemaBySlug) — então replicamos aqui a
// mesma leitura (Apps Script) e a mesma lógica de slug
// (ver esquemaSlug.ts daquele projeto) pra montar o link sem precisar abrir
// o app manualmente.
//
// Qualquer falha (rede, planilha sem esse horário/linha, env não
// configurada) retorna null — quem chama cai pro texto genérico, nunca manda
// um link quebrado.

type EsquemaRemoto = {
  id: number;
  nomeLinha: string;
  codLinha: string | null;
  horario: string; // "HH:mm"
  sentido: string; // "Ida" | "Volta" (case pode variar na planilha)
};

export type ViagemParaEsquema = {
  codigoLinha?: string | null;
  nomeLinha?: string | null;
  horario?: string | null; // "HH:mm" ou "HH:mm:ss"
  sentido?: string | null;
  // "linha" de exibição, ex.: "ALSP0053032 - MACEIO (AL) - SAO PAULO (SP)"
  // (occurrence.viagem.linha/lineLabel) — usado só como fallback quando
  // codigoLinha/nomeLinha vieram vazios (occorre quando a ocorrência não
  // ficou linkada a uma trip real no backend: tripLineCode/tripLineName
  // saem null, mas esse label sempre foi setado pelo formulário).
  linhaLabel?: string | null;
};

function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeText(value: string): string {
  return foldAccents(value).toUpperCase().replace(/\s+/g, " ").trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Mesma regra de src/shared/lib/esquemaSlug.ts do app de esquemas.
function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esquemaSlug(e: EsquemaRemoto): string {
  const base = e.codLinha?.trim() || slugify(e.nomeLinha);
  const hora = onlyDigits(e.horario);
  return `${base}-${hora}-${e.sentido.toLowerCase()}-${e.id}`;
}

// Cache em memória da lista de esquemas — evita rebuscar a planilha a cada
// notificação enviada na mesma sessão do app.
let esquemasCache: Promise<EsquemaRemoto[]> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// O deployment do Apps Script é instável sob request direto (sem sessão de
// navegador): confirmado no teste manual — de várias chamadas idênticas em
// sequência, algumas voltam 302/404 com página de login do Google em vez do
// JSON, sem padrão claro. 3 tentativas com backoff curto cobre isso sem
// atrasar demais o envio da notificação.
async function fetchEsquemasOnce(apiUrl: string): Promise<EsquemaRemoto[]> {
  const url = new URL(apiUrl);
  url.searchParams.set("action", "getLinhas");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`getLinhas falhou (${res.status})`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    // Página de login/erro do Google em vez do JSON esperado.
    throw new Error(`getLinhas devolveu ${contentType || "resposta sem content-type"} em vez de JSON`);
  }

  const data = await res.json();
  const lista = Array.isArray(data?.esquemas) ? data.esquemas : [];
  return lista
    .filter((e: any) => e && typeof e.id === "number" && typeof e.horario === "string" && typeof e.sentido === "string")
    .map((e: any) => ({
      id: e.id,
      nomeLinha: String(e.nomeLinha ?? ""),
      codLinha: e.codLinha ? String(e.codLinha) : null,
      horario: String(e.horario),
      sentido: String(e.sentido),
    }));
}

async function fetchEsquemas(): Promise<EsquemaRemoto[]> {
  const apiUrl = import.meta.env.VITE_ESQUEMAS_API_URL as string | undefined;
  if (!apiUrl) return [];

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchEsquemasOnce(apiUrl);
    } catch (err) {
      lastError = err;
      console.warn(`[esquemaLookup] getLinhas falhou (tentativa ${attempt}/3):`, err);
      if (attempt < 3) await sleep(attempt * 500);
    }
  }
  throw lastError;
}

function loadEsquemas(): Promise<EsquemaRemoto[]> {
  if (!esquemasCache) {
    esquemasCache = fetchEsquemas().catch((err) => {
      esquemasCache = null; // permite tentar de novo na próxima notificação
      throw err;
    });
  }
  return esquemasCache;
}

/**
 * Acha o esquema correspondente à viagem (código da linha + horário +
 * sentido) e devolve a URL completa pronta pra colar na mensagem.
 *
 * Sem match exato (dado insuficiente, código divergente entre as bases,
 * planilha instável etc.), cai pro link BASE do site (sem o `/esquema/slug`)
 * — o motorista/gestor ainda recebe algo clicável pra buscar manualmente, em
 * vez de ficar sem link nenhum. Só devolve null quando a env
 * VITE_ESQUEMAS_SITE_URL nem está configurada (aí não há link nenhum, nem
 * base, pra montar).
 */
export async function findEsquemaUrl(viagem: ViagemParaEsquema): Promise<string | null> {
  const siteUrl = import.meta.env.VITE_ESQUEMAS_SITE_URL as string | undefined;
  if (!siteUrl) {
    console.warn("[esquemaLookup] VITE_ESQUEMAS_SITE_URL não configurada — sem link possível.");
    return null;
  }
  const baseUrl = siteUrl.replace(/\/+$/, "") + "/";

  // codigoLinha/nomeLinha vêm de tripLineCode/tripLineName (join com a trip
  // real) — ficam vazios quando a ocorrência não está linkada a uma trip.
  // Cai pro parse do label de exibição ("COD - NOME"), que o formulário
  // sempre preenche quando uma viagem foi selecionada.
  const [codigoFallback, ...nomeFallbackParts] = (viagem.linhaLabel ?? "").split(" - ").map((s) => s.trim());
  const codigoLinha = viagem.codigoLinha?.trim() || codigoFallback || undefined;
  const nomeLinha = viagem.nomeLinha?.trim() || nomeFallbackParts.join(" - ") || undefined;
  const horario = viagem.horario ? onlyDigits(viagem.horario).slice(0, 4) : "";
  const sentido = viagem.sentido?.trim() || undefined;

  if (!horario || (!codigoLinha && !nomeLinha)) {
    console.warn("[esquemaLookup] dados insuficientes na ocorrência pra buscar o esquema — mandando link base:", {
      codigoLinha, nomeLinha, horario, sentido, linhaLabel: viagem.linhaLabel,
    });
    return baseUrl;
  }

  try {
    const esquemas = await loadEsquemas();

    const match = esquemas.find((e) => {
      const horaBate = onlyDigits(e.horario).slice(0, 4) === horario;
      // Sem sentido confiável na ocorrência, não filtra por ele — o par
      // linha+horário quase sempre já é suficiente pra desambiguar.
      const sentidoBate = !sentido || normalizeText(e.sentido) === normalizeText(sentido);
      if (!horaBate || !sentidoBate) return false;

      if (codigoLinha && e.codLinha) {
        return normalizeText(e.codLinha) === normalizeText(codigoLinha);
      }
      if (nomeLinha) {
        return normalizeText(e.nomeLinha) === normalizeText(nomeLinha);
      }
      return false;
    });

    if (!match) {
      console.warn("[esquemaLookup] nenhum esquema bateu com — mandando link base:", { codigoLinha, nomeLinha, horario, sentido });
      return baseUrl;
    }

    return `${baseUrl}esquema/${esquemaSlug(match)}`;
  } catch (err) {
    console.warn("[esquemaLookup] busca falhou, mandando link base:", err);
    return baseUrl;
  }
}
