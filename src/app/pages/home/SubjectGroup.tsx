import { AlertTriangle, Eye, EyeOff, Gavel, Loader2, RefreshCw, X } from "lucide-react";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import type { BatchOverlay, DriveStatus } from "../../components/OccurrenceCardDTO";
import { OccurrenceCardsView } from "./OccurrenceCardsView";

type BatchProgress = {
  running: boolean;
  cancelRequested: boolean;
  doneCount: number;
  total: number;
  onCancel: () => void;
};

interface SubjectGroupProps {
  subject: string;
  occs: OccurrenceDTO[];
  viewMode: "cards" | "list";
  isAdmin: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;

  anyBatchRunning: boolean;
  onRequestRegistrarTodas: (unregistered: OccurrenceDTO[]) => void;
  onRequestEnviarTratativas: (ids: string[]) => void;
  onRequestRevisarTodas: (ids: string[]) => void;

  registroBatch: BatchProgress;
  tratativaBatch: BatchProgress;
  revisarBatch: BatchProgress;

  vehicleOccurrenceCount: Map<string, number>;
  onOpen: (id: string) => void;
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
  getDriveStatus: (id: string) => DriveStatus;
  onSendToDrive: (occ: OccurrenceDTO) => void;
  getBatchOverlay: (occId: string) => BatchOverlay | undefined;
  getTratativaOverlay: (occId: string) => BatchOverlay | undefined;
  getRevisarOverlay: (occId: string) => BatchOverlay | undefined;
  relatoriosFolderId?: string;
  medidasFolderId?: string;
  onNeedFolderConfig: () => void;
}

/** Um bloco de ocorrências agrupadas pelo mesmo assunto: cabeçalho com ações
 * em lote (registrar/tratativas/revisar), banners de progresso e a lista de
 * cards. Extraído de `home.tsx` — só reorganiza o JSX existente em um
 * componente, sem alterar a lógica de lote (que continua em `home.tsx`). */
export function SubjectGroup({
  subject,
  occs,
  viewMode,
  isAdmin,
  collapsed,
  onToggleCollapse,
  anyBatchRunning,
  onRequestRegistrarTodas,
  onRequestEnviarTratativas,
  onRequestRevisarTodas,
  registroBatch,
  tratativaBatch,
  revisarBatch,
  vehicleOccurrenceCount,
  onOpen,
  onEditar,
  onExcluir,
  getDriveStatus,
  onSendToDrive,
  getBatchOverlay,
  getTratativaOverlay,
  getRevisarOverlay,
  relatoriosFolderId,
  medidasFolderId,
  onNeedFolderConfig,
}: SubjectGroupProps) {
  const unregistered = occs.filter((o) => !o.rizerRegistered);
  const pendingTratativa = occs.filter((o) => o.faltaTratativa);
  const registered = occs.filter((o) => o.rizerRegistered);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {subject}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({occs.length})</span>

        {isAdmin && !anyBatchRunning && unregistered.length > 0 && (
          <button
            onClick={() => onRequestRegistrarTodas(unregistered)}
            className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
          >
            <Gavel className="w-3 h-3" />
            Registrar todas ({unregistered.length})
          </button>
        )}

        {isAdmin && !anyBatchRunning && pendingTratativa.length > 0 && (
          <button
            onClick={() => onRequestEnviarTratativas(pendingTratativa.map((o) => o.id))}
            className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" />
            Enviar tratativas ({pendingTratativa.length})
          </button>
        )}

        {isAdmin && !anyBatchRunning && registered.length > 0 && (
          <button
            onClick={() => onRequestRevisarTodas(registered.map((o) => o.id))}
            className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Revisar todas ({registered.length})
          </button>
        )}

        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Mostrar ocorrências" : "Ocultar ocorrências"}
          className="cursor-pointer ml-auto p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {registroBatch.running && (
        <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin shrink-0" />
          <span className="text-xs font-medium text-orange-700 flex-1">
            {registroBatch.cancelRequested
              ? "Cancelando após item atual..."
              : `Registrando no RIZER… ${registroBatch.doneCount} de ${registroBatch.total}`}
          </span>
          {!registroBatch.cancelRequested && (
            <button
              onClick={registroBatch.onCancel}
              className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-orange-500 hover:text-orange-700 transition-colors"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
          )}
        </div>
      )}

      {tratativaBatch.running && (
        <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
          <span className="text-xs font-medium text-amber-700 flex-1">
            {tratativaBatch.cancelRequested
              ? "Cancelando após item atual..."
              : `Preenchendo tratativas… ${tratativaBatch.doneCount} de ${tratativaBatch.total}`}
          </span>
          {!tratativaBatch.cancelRequested && (
            <button
              onClick={tratativaBatch.onCancel}
              className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-amber-500 hover:text-amber-700 transition-colors"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
          )}
        </div>
      )}

      {revisarBatch.running && (
        <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
          <span className="text-xs font-medium text-emerald-700 flex-1">
            {revisarBatch.cancelRequested
              ? "Cancelando após item atual..."
              : `Revisando no RIZER… ${revisarBatch.doneCount} de ${revisarBatch.total}`}
          </span>
          {!revisarBatch.cancelRequested && (
            <button
              onClick={revisarBatch.onCancel}
              className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-emerald-500 hover:text-emerald-700 transition-colors"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
          )}
        </div>
      )}

      {!collapsed && (
        <OccurrenceCardsView
          occurrences={occs}
          viewMode={viewMode}
          vehicleOccurrenceCount={vehicleOccurrenceCount}
          onOpen={onOpen}
          onEditar={onEditar}
          onExcluir={onExcluir}
          getDriveStatus={getDriveStatus}
          onSendToDrive={onSendToDrive}
          getBatchOverlay={getBatchOverlay}
          getTratativaOverlay={getTratativaOverlay}
          getRevisarOverlay={getRevisarOverlay}
          relatoriosFolderId={relatoriosFolderId}
          medidasFolderId={medidasFolderId}
          onNeedFolderConfig={onNeedFolderConfig}
        />
      )}
    </div>
  );
}
