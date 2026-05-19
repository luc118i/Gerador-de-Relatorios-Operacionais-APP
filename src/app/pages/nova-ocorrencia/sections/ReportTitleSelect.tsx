import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListChecks, Search } from "lucide-react";

interface ReportTitleSelectProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  hasError?: boolean;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim().toUpperCase();
  if (!q) return <>{text}</>;
  const idx = text.toUpperCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-blue-600">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

export function ReportTitleSelect({
  value,
  onChange,
  presets,
  hasError,
}: ReportTitleSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = search.trim()
    ? presets.filter((p) => p.includes(search.trim().toUpperCase()))
    : presets;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!listRef.current || activeIdx < 0) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        e.preventDefault();
        break;
      case "ArrowUp":
        setActiveIdx((i) => Math.max(i - 1, 0));
        e.preventDefault();
        break;
      case "Enter":
        if (activeIdx >= 0 && filtered[activeIdx]) {
          select(filtered[activeIdx]);
          e.preventDefault();
        }
        break;
      case "Escape":
        setOpen(false);
        setSearch("");
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-md text-left focus:outline-none focus:ring-2 bg-white ${
          hasError
            ? "border-red-400 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        }`}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 text-sm truncate ${value ? "text-gray-900" : "text-gray-400"}`}>
          {value || "Selecione o nome da ocorrência..."}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value.toUpperCase());
                setActiveIdx(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar nome..."
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <ListChecks className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nomes padronizados
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Nenhum nome encontrado
            </div>
          ) : (
            <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
              {filtered.map((name, i) => (
                <li
                  key={name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(name);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    i === activeIdx ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <HighlightMatch text={name} query={search} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
