import { useEffect, useMemo, useRef, useState } from "react";
import { Bus, ChevronDown } from "lucide-react";
import type { ViagemCatalog } from "../types";

type AutocompleteViagemProps = {
  viagens: ViagemCatalog[];
  value: ViagemCatalog | null;
  onChange: (v: ViagemCatalog) => void;
};

export function AutocompleteViagem({
  viagens,
  value,
  onChange,
}: AutocompleteViagemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const filteredViagens = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return viagens;

    return viagens.filter((v) => {
      return (
        v.codigoLinha.toLowerCase().includes(q) ||
        v.nomeLinha.toLowerCase().includes(q) ||
        v.horaPartida.toLowerCase().includes(q) ||
        v.sentido.toLowerCase().includes(q)
      );
    });
  }, [viagens, search]);

  const displayText = value
    ? `${value.codigoLinha} - ${value.nomeLinha} - ${value.horaPartida} (${value.sentido})`
    : "Selecione uma viagem";

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Viagem
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {displayText}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Buscar por código, nome, horário ou sentido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-64">
            {filteredViagens.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
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
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
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
