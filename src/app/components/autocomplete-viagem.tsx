import { useEffect, useMemo, useState } from "react";
import { Bus, ChevronDown, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
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
    .replace(/\p{Mn}/gu, "")
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
  // Dispara o stagger da lista uma única vez por abertura (classe `.is-in`),
  // em vez de por item — evita reanimar/piscar a cada tecla digitada.
  const [listIn, setListIn] = useState(false);

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

  function closeMenu() {
    setIsOpen(false);
    setSearch("");
  }

  // `.is-in` só entra no frame seguinte à abertura, pra a transição CSS ter
  // um estado inicial (escondido) de onde partir.
  useEffect(() => {
    if (!isOpen) {
      setListIn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setListIn(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Fecha o menu ao rolar a página — evita ele ficar "flutuando" desalinhado
  // do campo enquanto o usuário rola. Ignora o scroll da própria lista de
  // resultados dentro do menu (senão rolar a lista já fecharia o menu).
  useEffect(() => {
    if (!isOpen) return;
    function handleScroll(e: Event) {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-slot="popover-content"]')) return;
      closeMenu();
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Viagem
      </label>

      <Popover
        open={isOpen}
        onOpenChange={(open) => (open ? setIsOpen(true) : closeMenu())}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="cursor-pointer w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className={value ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
              {displayText}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-[100] p-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-80 overflow-hidden"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-800 space-y-2">
            <input
              type="text"
              placeholder="Buscar por código, nome, horário ou sentido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {onCreateRequested ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateRequested();
                }}
                className="cursor-pointer w-full h-9 px-3 rounded-md flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar linha
              </button>
            ) : null}
          </div>

          <div className={`combo-list overflow-y-auto max-h-60${listIn ? " is-in" : ""}`}>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Carregando viagens...
              </div>
            ) : filteredViagens.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
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
                  className="cursor-pointer w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Bus className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {viagem.codigoLinha}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {viagem.sentido}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {viagem.nomeLinha}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Horário: {viagem.horaPartida}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
