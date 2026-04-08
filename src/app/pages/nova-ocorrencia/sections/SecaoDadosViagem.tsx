import { AutocompleteViagem } from "../../../components/autocomplete-viagem";
import type { ViagemCatalog } from "../../../types";
import { viagensCatalog } from "../../../../catalogs/viagens.catalog";

interface SecaoDadosViagemProps {
  viagemSelecionada: ViagemCatalog | null;
  onViagemChange: (v: ViagemCatalog | null) => void;
  isGeneric: boolean;
}

export function SecaoDadosViagem({
  viagemSelecionada,
  onViagemChange,
  isGeneric,
}: SecaoDadosViagemProps) {
  return (
    <section className={isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Dados da Viagem
      </h2>
      <div className="space-y-4">
        <AutocompleteViagem
          viagens={viagensCatalog.rows}
          value={viagemSelecionada}
          onChange={onViagemChange}
        />
        {viagemSelecionada && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="text-xs text-gray-600">Linha</label>
              <p className="font-medium text-gray-900">
                {viagemSelecionada.codigoLinha} – {viagemSelecionada.nomeLinha}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-600">Horário da Viagem</label>
              <p className="font-medium text-gray-900">
                {viagemSelecionada.horaPartida}
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Sentido</label>
              <p className="font-medium text-gray-900">
                {viagemSelecionada.sentido}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
