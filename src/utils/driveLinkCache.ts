/**
 * Cache local (localStorage) do link do Drive (webViewLink) por ocorrência.
 *
 * O backend não retorna o link do relatório no Drive no DTO da ocorrência —
 * ele só é conhecido no momento do envio (POST .../drive). Para que a UI possa
 * mostrar "Abrir no Drive" depois, guardamos o webViewLink aqui, indexado pelo
 * id da ocorrência. É best-effort (escopo do navegador), não fonte de verdade.
 */
const STORAGE_KEY = "occ_drive_links";

type LinkMap = Record<string, string>;

function readAll(): LinkMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LinkMap) : {};
  } catch {
    return {};
  }
}

export function getDriveLink(occurrenceId: string): string | null {
  return readAll()[occurrenceId] ?? null;
}

export function setDriveLink(occurrenceId: string, webViewLink: string): void {
  try {
    const all = readAll();
    all[occurrenceId] = webViewLink;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / serialization errors */
  }
}
