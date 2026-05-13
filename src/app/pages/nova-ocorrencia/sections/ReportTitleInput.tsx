import { useEffect, useRef, useState } from "react";
import { Clock, Search } from "lucide-react";

interface ReportTitleInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
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

export function ReportTitleInput({
  value,
  onChange,
  suggestions,
  hasError,
}: ReportTitleInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const query = value.trim().toUpperCase();
  const filtered = query
    ? suggestions.filter((s) => s.includes(query)).slice(0, 8)
    : suggestions.slice(0, 8);

  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!listRef.current || activeIdx < 0) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function select(title: string) {
    onChange(title);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        setActiveIdx(0);
        e.preventDefault();
      }
      return;
    }
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
        if (activeIdx >= 0) {
          select(filtered[activeIdx]);
          e.preventDefault();
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: Atendimento Especial, Acidente, Pane Mecânica..."
          className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            hasError
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          data-form-nav
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Mais recentes
            </span>
          </div>

          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {filtered.map((s, i) => (
              <li
                key={s}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    i === activeIdx ? "text-blue-400" : "text-gray-300"
                  }`}
                />
                <span className={i === activeIdx ? "text-blue-700" : "text-gray-800"}>
                  <HighlightMatch text={s} query={value} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
