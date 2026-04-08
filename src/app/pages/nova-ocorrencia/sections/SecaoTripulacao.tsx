import { AlertCircle, Plus, X } from "lucide-react";
import { DriverPicker } from "../../../components/DriverPicker/DriverPicker";
import { DriverCreateModal } from "../../../components/DriverCreateModal/DriverCreateModal";
import type { Driver } from "../../../../domain/drivers";

interface SecaoTripulacaoProps {
  driver1Id: string | null;
  driver1: Driver | null;
  driver2Id: string | null;
  driver2: Driver | null;
  motorista2Ativo: boolean;
  isDriverModalOpen: boolean;
  createTarget: 1 | 2 | null;
  isGeneric: boolean;
  onDriver1Change: (id: string | null, d: Driver | null) => void;
  onDriver2Change: (id: string | null, d: Driver | null) => void;
  onToggleMotorista2: (active: boolean) => void;
  onDriverModalOpenChange: (open: boolean) => void;
  onCreateTargetChange: (target: 1 | 2 | null) => void;
  onDriverCreated: (created: Driver) => void;
}

export function SecaoTripulacao({
  driver1Id,
  driver1,
  driver2Id,
  driver2,
  motorista2Ativo,
  isDriverModalOpen,
  createTarget,
  isGeneric,
  onDriver1Change,
  onDriver2Change,
  onToggleMotorista2,
  onDriverModalOpenChange,
  onCreateTargetChange,
  onDriverCreated,
}: SecaoTripulacaoProps) {
  return (
    <section className={isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Tripulação
      </h2>
      <div className="space-y-4">
        <DriverPicker
          label="Motorista 01"
          required
          value={driver1Id}
          initialDriver={
            driver1
              ? { id: driver1.id, code: driver1.code, name: driver1.name, base: driver1.base ?? "" }
              : undefined
          }
          excludedIds={driver2Id ? [driver2Id] : []}
          onChange={(id, d) => onDriver1Change(id, d ?? null)}
          onCreateRequested={() => {
            onCreateTargetChange(1);
            onDriverModalOpenChange(true);
          }}
        />

        {motorista2Ativo ? (
          <div className="relative">
            <DriverPicker
              label="Motorista 02"
              value={driver2Id}
              initialDriver={
                driver2
                  ? { id: driver2.id, code: driver2.code, name: driver2.name, base: driver2.base ?? "" }
                  : undefined
              }
              excludedIds={driver1Id ? [driver1Id] : []}
              onChange={(id, d) => onDriver2Change(id, d ?? null)}
              onCreateRequested={() => {
                onCreateTargetChange(2);
                onDriverModalOpenChange(true);
              }}
            />
            <button
              onClick={() => onToggleMotorista2(false)}
              className="cursor-pointer absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Remover Motorista 02"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onToggleMotorista2(true)}
            className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Motorista 02
          </button>
        )}

        {driver1Id && driver2Id && driver1Id === driver2Id && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            <AlertCircle className="w-4 h-4" />
            Motorista 01 e 02 não podem ser o mesmo.
          </div>
        )}
      </div>

      <DriverCreateModal
        open={isDriverModalOpen}
        onOpenChange={(open) => {
          onDriverModalOpenChange(open);
          if (!open) onCreateTargetChange(null);
        }}
        onCreated={onDriverCreated}
      />
    </section>
  );
}
