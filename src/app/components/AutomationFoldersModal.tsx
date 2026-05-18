import { useState } from "react";
import { FolderOpen, X, Check } from "lucide-react";
import type { AutomationFolders } from "../../hooks/useAutomationFolders";

interface Props {
  current: AutomationFolders | null;
  onConfirm: (data: AutomationFolders) => void;
  onClose: () => void;
}

function parseFolderId(input: string): string {
  const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? input.trim();
}

function FolderInput({
  label,
  urlValue,
  nameValue,
  onUrlChange,
  onNameChange,
}: {
  label: string;
  urlValue: string;
  nameValue: string;
  onUrlChange: (v: string) => void;
  onNameChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        placeholder="Cole o link da pasta do Google Drive"
        value={urlValue}
        onChange={(e) => onUrlChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <input
        type="text"
        placeholder="Nome da pasta (opcional)"
        value={nameValue}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

export function AutomationFoldersModal({ current, onConfirm, onClose }: Props) {
  const [relatoriosUrl, setRelatoriosUrl] = useState(
    current?.relatoriosFolderId
      ? `https://drive.google.com/drive/folders/${current.relatoriosFolderId}`
      : "",
  );
  const [relatoriosName, setRelatoriosName] = useState(current?.relatoriosFolderName ?? "");
  const [medidasUrl, setMedidasUrl] = useState(
    current?.medidasFolderId
      ? `https://drive.google.com/drive/folders/${current.medidasFolderId}`
      : "",
  );
  const [medidasName, setMedidasName] = useState(current?.medidasFolderName ?? "");

  const relatoriosId = parseFolderId(relatoriosUrl);
  const medidasId = parseFolderId(medidasUrl);
  const isValid = relatoriosId.length > 5 && medidasId.length > 5;

  function handleConfirm() {
    if (!isValid) return;
    onConfirm({
      relatoriosFolderId: relatoriosId,
      relatoriosFolderName: relatoriosName.trim() || relatoriosId,
      medidasFolderId: medidasId,
      medidasFolderName: medidasName.trim() || medidasId,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <FolderOpen className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Configurar pastas do Drive</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Cole o link das pastas do Google Drive. A configuração fica salva para as próximas ações.
        </p>

        <div className="space-y-4">
          <FolderInput
            label="Pasta de Relatórios"
            urlValue={relatoriosUrl}
            nameValue={relatoriosName}
            onUrlChange={setRelatoriosUrl}
            onNameChange={setRelatoriosName}
          />
          <FolderInput
            label="Pasta de Medidas / Tratativas"
            urlValue={medidasUrl}
            nameValue={medidasName}
            onUrlChange={setMedidasUrl}
            onNameChange={setMedidasName}
          />
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
