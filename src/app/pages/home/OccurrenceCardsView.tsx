import { OccurrenceCard, type BatchOverlay, type DriveStatus } from "../../components/OccurrenceCardDTO";
import type { OccurrenceDTO } from "../../../domain/occurrences";

function splitByDriver(occ: OccurrenceDTO): Array<{ occ: OccurrenceDTO; driverSlot: 1 | 2 }> {
  const hasDriver2 = (occ.drivers ?? []).some((d) => d.position === 2 && d.name);
  return hasDriver2
    ? [{ occ, driverSlot: 1 }, { occ, driverSlot: 2 }]
    : [{ occ, driverSlot: 1 }];
}

interface OccurrenceCardsViewProps {
  occurrences: OccurrenceDTO[];
  viewMode: "cards" | "list";
  vehicleOccurrenceCount: Map<string, number>;
  onOpen: (id: string) => void;
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
  getDriveStatus: (id: string) => DriveStatus;
  onSendToDrive: (occ: OccurrenceDTO) => void;
  getBatchOverlay?: (occId: string) => BatchOverlay | undefined;
  getTratativaOverlay?: (occId: string) => BatchOverlay | undefined;
  getRevisarOverlay?: (occId: string) => BatchOverlay | undefined;
  relatoriosFolderId?: string;
  medidasFolderId?: string;
  onNeedFolderConfig: () => void;
  /** true enquanto qualquer lote (registro/tratativa/revisão) está rodando —
   * bloqueia a edição pra não mexer numa ocorrência que o robô pode estar
   * processando nesse momento. */
  editDisabled?: boolean;
  /** Classe extra no contêiner da grade/lista. Usada pelo SubjectGroup pra
   * ligar o stagger dos cards (`stagger-cards`) ao expandir o assunto. */
  containerClassName?: string;
}

/** Grade ou lista compacta de `OccurrenceCard`, com a divisão por motorista
 * (ocorrências com 2 motoristas viram 2 cards). Compartilhada entre a
 * listagem agrupada por assunto e a listagem simples. */
export function OccurrenceCardsView({
  occurrences,
  viewMode,
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
  editDisabled = false,
  containerClassName = "",
}: OccurrenceCardsViewProps) {
  const items = occurrences.flatMap(splitByDriver);

  const cards = items.map(({ occ, driverSlot }) => (
    <OccurrenceCard
      key={driverSlot === 2 ? `${occ.id}-2` : occ.id}
      compact={viewMode === "list"}
      occurrence={occ}
      driverSlot={driverSlot}
      duplicateVehicleCount={vehicleOccurrenceCount.get(occ.vehicleNumber) ?? 1}
      onOpen={() => onOpen(occ.id)}
      onEditar={() => onEditar(occ.id)}
      onExcluir={() => onExcluir(occ.id)}
      driveStatus={getDriveStatus(occ.id)}
      onSendToDrive={() => onSendToDrive(occ)}
      batchOverlay={getBatchOverlay?.(occ.id)}
      tratativaOverlay={getTratativaOverlay?.(occ.id)}
      revisarOverlay={getRevisarOverlay?.(occ.id)}
      relatoriosFolderId={relatoriosFolderId}
      medidasFolderId={medidasFolderId}
      onNeedFolderConfig={onNeedFolderConfig}
      editDisabled={editDisabled}
    />
  ));

  if (viewMode === "list") {
    return (
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden ${containerClassName}`}>
        <div
          className="flex items-center gap-0 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide"
          style={{ borderLeft: "3px solid transparent" }}
        >
          <div className="w-[70px] flex-shrink-0 px-3 py-2">Prefixo</div>
          <div className="w-[80px] flex-shrink-0 px-1 py-2 hidden sm:block">Base</div>
          <div className="flex-1 px-2 py-2">Ocorrência</div>
          <div className="w-[115px] flex-shrink-0 px-2 py-2 hidden sm:block">Horário</div>
          <div className="w-[170px] flex-shrink-0 px-2 py-2 hidden lg:block">Motorista</div>
          <div className="w-[310px] flex-shrink-0 px-1 py-2">Ações</div>
        </div>
        {cards}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${containerClassName}`}>
      {cards}
    </div>
  );
}
