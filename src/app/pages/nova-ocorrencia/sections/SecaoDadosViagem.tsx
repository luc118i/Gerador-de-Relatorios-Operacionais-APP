import { useState } from "react";
import { AutocompleteViagem } from "../../../components/autocomplete-viagem";
import { TripCreateModal } from "../../../components/TripCreateModal/TripCreateModal";
import type { ViagemCatalog } from "../../../types";
import type { Trip } from "../../../../domain/trips";

interface SecaoDadosViagemProps {
  viagemSelecionada: ViagemCatalog | null;
  onViagemChange: (v: ViagemCatalog | null) => void;
  isGeneric: boolean;
}

function tripToViagem(t: Trip): ViagemCatalog {
  return {
    id: t.id,
    codigoLinha: t.lineCode,
    nomeLinha: t.lineName,
    horaPartida: t.departureTime,
    sentido: t.direction,
  };
}

export function SecaoDadosViagem({
  viagemSelecionada,
  onViagemChange,
  isGeneric,
}: SecaoDadosViagemProps) {
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  function handleTripCreated(trip: Trip) {
    onViagemChange(tripToViagem(trip));
  }

  return (
    <section
      className={
        isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""
      }
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Dados da Viagem
      </h2>
      <div className="space-y-4">
        <AutocompleteViagem
          value={viagemSelecionada}
          onChange={onViagemChange}
          onCreateRequested={() => setIsTripModalOpen(true)}
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

      <TripCreateModal
        open={isTripModalOpen}
        onOpenChange={setIsTripModalOpen}
        onCreated={handleTripCreated}
      />
    </section>
  );
}
