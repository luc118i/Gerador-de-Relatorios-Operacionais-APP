import { AlertCircle } from "lucide-react";
import { LocalPicker } from "../../../components/LocalPicker/LocalPicker";
import type { OccurrenceTypeConfig } from "../../../config/occurrenceTypes";
import type { Local } from "../../../../api/locais.api";
import { DatePicker } from "../../../components/ui/date-picker";
import { TimePicker } from "../../../components/ui/time-picker";

interface SecaoDadosEventoProps {
  typeConfig: OccurrenceTypeConfig;
  dataEvento: string;
  onDataEventoChange: (v: string) => void;
  dataViagem: string;
  onDataViagemChange: (v: string) => void;
  horarioInicial: string;
  onHorarioInicialChange: (v: string) => void;
  horarioFinal: string;
  onHorarioFinalChange: (v: string) => void;
  localParada: Local | null;
  onLocalParadaChange: (v: Local | null) => void;
  speedKmh: number | null;
  onSpeedKmhChange: (v: number | null) => void;
  vehicleNumber: string;
  onVehicleNumberChange: (v: string) => void;
  isHorarioValido: boolean;
}

export function SecaoDadosEvento({
  typeConfig,
  dataEvento, onDataEventoChange,
  dataViagem, onDataViagemChange,
  horarioInicial, onHorarioInicialChange,
  horarioFinal, onHorarioFinalChange,
  localParada, onLocalParadaChange,
  speedKmh, onSpeedKmhChange,
  vehicleNumber, onVehicleNumberChange,
  isHorarioValido,
}: SecaoDadosEventoProps) {
  const inputBase = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <section className={typeConfig.isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Dados do Evento
      </h2>
      <div className="space-y-4">
        {typeConfig.singleTime ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Evento *</label>
              <DatePicker value={dataEvento} onChange={onDataEventoChange} placeholder="Data do evento" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Viagem *</label>
              <DatePicker value={dataViagem} onChange={onDataViagemChange} placeholder="Data da viagem" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário do Evento *</label>
              <TimePicker
                value={horarioInicial}
                onChange={(v) => {
                  onHorarioInicialChange(v);
                  onHorarioFinalChange(v);
                }}
                placeholder="HH:MM"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Evento *</label>
                <DatePicker value={dataEvento} onChange={onDataEventoChange} placeholder="Data do evento" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Viagem *</label>
                <DatePicker value={dataViagem} onChange={onDataViagemChange} placeholder="Data da viagem" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário Inicial *</label>
                <TimePicker value={horarioInicial} onChange={onHorarioInicialChange} placeholder="HH:MM" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário Final *</label>
                <TimePicker
                  value={horarioFinal}
                  onChange={onHorarioFinalChange}
                  placeholder="HH:MM"
                  hasError={!isHorarioValido && !!horarioInicial && !!horarioFinal}
                />
              </div>
            </div>
            {!isHorarioValido && horarioInicial && horarioFinal && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4" />
                Horário final deve ser posterior ao horário inicial
              </div>
            )}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prefixo do Veículo *</label>
          <input
            type="text"
            inputMode="numeric"
            value={vehicleNumber}
            onChange={(e) => onVehicleNumberChange(e.target.value)}
            placeholder="Ex: 24615"
            className={inputBase}
          />
        </div>

        {typeConfig.showPlace && (
          <div>
            {typeConfig.isGeneric ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local da Ocorrência
                </label>
                <input
                  type="text"
                  value={localParada?.nome ?? ""}
                  onChange={(e) =>
                    onLocalParadaChange(e.target.value ? { id: 0, nome: e.target.value } : null)
                  }
                  placeholder="Ex: Campinas – SP, Rodoviária de Curitiba..."
                  className={inputBase}
                />
              </>
            ) : (
              <LocalPicker value={localParada} onChange={onLocalParadaChange} required />
            )}
          </div>
        )}

        {typeConfig.showSpeed && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Velocidade Atingida (km/h) *
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={speedKmh ?? ""}
              onChange={(e) => onSpeedKmhChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="Ex: 92"
              className={inputBase}
            />
          </div>
        )}
      </div>
    </section>
  );
}
