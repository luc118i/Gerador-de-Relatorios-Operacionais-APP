import { useEffect, useMemo, useRef, useState } from "react";
import { Bus, ChevronDown, PlusCircle } from "lucide-react";
import type { ViagemCatalog } from "../types";
import { useTrips } from "../../features/trips/queries/trips.queries";
import type { Trip } from "../../domain/trips";

type AutocompleteViagemProps = {
  value: ViagemCatalog | null;
  onChange: (v: ViagemCatalog) => void;
  onCreateRequested?: () => void;
};

function tripToViagem(t: Trip): ViagemCatalog {
  return {
    id: t.id,
    codigoLinha: t.lineCode,
    nomeLinha: t.lineName,
    horaPartida: t.departureTime,
    sentido: t.direction,
  };
}

function normalize(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Torna o input de busca inteligente para horários:
 *   "2100"  → "21:00"
 *   "730"   → "07:30"
 *   "21h00" → "21:00"
 * Qualquer outro texto passa sem alteração.
 */
function normalizeTimeQuery(s: string): string {
  // "21h00" / "21H00" → "21:00"
  s = s.replace(/\b(\d{1,2})[hH](\d{2})\b/g, "$1:$2");
  // "2100" → "21:00"  |  "730" → "07:30"
  s = s.replace(/\b(\d{3,4})\b/g, (match) => {
    if (match.length === 4) {
      const h = match.slice(0, 2), m = match.slice(2);
      if (+h <= 23 && +m <= 59) return `${h}:${m}`;
    } else {
      const h = `0${match[0]}`, m = match.slice(1);
      if (+h <= 23 && +m <= 59) return `${h}:${m}`;
    }
    return match;
  });
  return s;
}

function buildHaystack(v: ViagemCatalog) {
  return normalize(
    [
      v.codigoLinha,
      v.nomeLinha,
      v.horaPartida,
      v.sentido,
      `${v.codigoLinha} ${v.nomeLinha}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function AutocompleteViagem({
  value,
  onChange,
  onCreateRequested,
}: AutocompleteViagemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: trips = [], isLoading } = useTrips();

  const viagens = useMemo(() => trips.map(tripToViagem), [trips]);

  const indexed = useMemo(
    () => viagens.map((v) => ({ v, hay: buildHaystack(v) })),
    [viagens],
  );

  const filteredViagens = useMemo(() => {
    const q = normalize(normalizeTimeQuery(search));
    if (!q) return viagens;

    const tokens = q.split(/\s+/).filter(Boolean);
    return indexed
      .filter(({ hay }) => tokens.every((t) => hay.includes(t)))
      .map(({ v }) => v);
  }, [indexed, viagens, search]);

  // fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayText = value
    ? [
        `${value.codigoLinha} - ${value.nomeLinha}`,
        value.horaPartida,
        value.sentido || null,
      ]
        .filter(Boolean)
        .join(" - ")
    : "Selecione uma viagem";

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Viagem
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {displayText}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200 space-y-2">
            <input
              type="text"
              placeholder="Buscar por código, nome, horário ou sentido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {onCreateRequested ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateRequested();
                }}
                className="cursor-pointer w-full h-9 px-3 rounded-md flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar linha
              </button>
            ) : null}
          </div>

          <div className="overflow-y-auto max-h-60">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Carregando viagens...
              </div>
            ) : filteredViagens.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhuma viagem encontrada
              </div>
            ) : (
              filteredViagens.map((viagem) => (
                <button
                  key={viagem.id}
                  type="button"
                  onClick={() => {
                    onChange(viagem);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Bus className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {viagem.codigoLinha}
                        </span>
                        <span className="text-xs text-gray-500">
                          {viagem.sentido}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {viagem.nomeLinha}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Horário: {viagem.horaPartida}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
