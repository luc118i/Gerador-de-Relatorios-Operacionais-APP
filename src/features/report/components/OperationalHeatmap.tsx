import { Grid3x3 } from "lucide-react";
import { useReport } from "../ReportContext";
import { Panel, SectionTitle } from "./primitives";
import { HEATMAP_BLOCKS, HEATMAP_WEEKDAYS } from "../range-aggregations";

function cellColor(count: number, max: number): string {
  if (count === 0) return "transparent";
  const t = Math.min(1, 0.15 + (count / max) * 0.85);
  return `rgba(59, 130, 246, ${t})`; // azul principal
}

export function OperationalHeatmap() {
  const { range } = useReport();
  const { matrix, max, colTotals } = range.heatmap;

  return (
    <Panel className="p-5">
      <SectionTitle icon={<Grid3x3 className="w-3.5 h-3.5 text-blue-400" />}>
        Concentração por dia e horário
      </SectionTitle>

      {max === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Sem dados no recorte atual.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 text-[10px]">
            <thead>
              <tr>
                <th />
                {HEATMAP_BLOCKS.map((b) => (
                  <th key={b} className="font-medium text-gray-400 dark:text-gray-500 tabular-nums px-1">
                    {b}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, r) => (
                <tr key={r}>
                  <td className="pr-2 text-right font-medium text-gray-500 dark:text-gray-400">{HEATMAP_WEEKDAYS[r]}</td>
                  {row.map((count, c) => (
                    <td key={c}>
                      <div
                        title={`${HEATMAP_WEEKDAYS[r]} ${HEATMAP_BLOCKS[c]}h–${String(Number(HEATMAP_BLOCKS[c]) + 3).padStart(2, "0")}h — ${count} ocorrência${count !== 1 ? "s" : ""}`}
                        className="w-7 h-7 rounded border border-gray-100 dark:border-gray-800 flex items-center justify-center tabular-nums text-gray-600 dark:text-gray-300"
                        style={{ backgroundColor: cellColor(count, max) }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="pr-2 text-right font-medium text-gray-300 dark:text-gray-600">Σ</td>
                {colTotals.map((t, c) => (
                  <td key={c} className="text-center text-gray-400 dark:text-gray-500 tabular-nums pt-0.5">
                    {t || ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
