import { useEffect, useRef, useState } from "react";
import { FolderOpen, Loader2, X, Check, FolderUp } from "lucide-react";
import type { DriveFolderConfig } from "../../../../../hooks/useDriveFolder";
import { loadScript, requestDriveToken } from "../../../../../utils/googleAuth";

// ── Tipos mínimos para as APIs do Google injetadas via script ─────────────────
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

interface Props {
  onConfirm: (args: {
    config: DriveFolderConfig;
    accessToken: string;
    saveAsDefault: boolean;
  }) => void;
  onClose: () => void;
  currentConfig: DriveFolderConfig | null;
}

type Step = "connect" | "picking" | "selected";

export function DrivePickerModal({ onConfirm, onClose, currentConfig }: Props) {
  const [step, setStep] = useState<Step>(currentConfig ? "selected" : "connect");
  const [selectedFolder, setSelectedFolder] = useState<DriveFolderConfig | null>(
    currentConfig ?? null,
  );
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  useEffect(() => {
    // Pré-carrega os scripts assim que o modal abre
    Promise.all([
      loadScript("https://accounts.google.com/gsi/client"),
      loadScript("https://apis.google.com/js/api.js"),
    ]).catch(() => { /* ignora — erro só aparece ao clicar */ });
  }, []);

  async function handleConnect() {
    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID não configurado no .env");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Solicita access token via utilitário compartilhado
      const token = await requestDriveToken(clientId);
      tokenRef.current = token;

      // Carrega o módulo picker do GAPI
      await loadScript("https://apis.google.com/js/api.js");
      await new Promise<void>((resolve) => window.gapi.load("picker", resolve));

      openPicker(token, apiKey ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao conectar com o Google");
      setLoading(false);
    }
  }

  function openPicker(token: string, key: string) {
    setStep("picking");

    const view = new window.google.picker.DocsView(
      window.google.picker.ViewId.FOLDERS,
    );
    view.setSelectFolderEnabled(true);
    view.setMimeTypes("application/vnd.google-apps.folder");

    let builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setTitle("Escolha uma pasta no Google Drive");

    if (key) builder = builder.setDeveloperKey(key);

    const picker = builder
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          setSelectedFolder({ folderId: doc.id, folderName: doc.name });
          setStep("selected");
          setLoading(false);
        } else if (data.action === window.google.picker.Action.CANCEL) {
          setStep(currentConfig ? "selected" : "connect");
          setLoading(false);
        }
      })
      .build();

    picker.setVisible(true);
  }

  async function reauthenticate(): Promise<string> {
    if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID não configurado");
    return requestDriveToken(clientId);
  }

  async function handleConfirm() {
    if (!selectedFolder) return;

    let token = tokenRef.current;

    // Token expirou ou página foi recarregada — pede novo sem abrir o picker
    if (!token) {
      setLoading(true);
      setError(null);
      try {
        token = await reauthenticate();
        tokenRef.current = token;
      } catch (e: any) {
        setError(e?.message ?? "Falha ao autenticar com o Google");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    onConfirm({
      config: selectedFolder,
      accessToken: token,
      saveAsDefault,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <FolderUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Enviar ao Google Drive
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Pasta selecionada */}
          {selectedFolder ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <FolderOpen className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900 truncate">
                  {selectedFolder.folderName}
                </p>
                <p className="text-xs text-blue-500 truncate">
                  {selectedFolder.folderId}
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="cursor-pointer shrink-0 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Trocar
              </button>
            </div>
          ) : step === "connect" ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Escolha a pasta de destino
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Faça login com sua conta Google para selecionar a pasta onde
                  os PDFs serão enviados.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Abrindo seletor de pasta…</span>
            </div>
          )}

          {/* Toggle salvar como padrão */}
          {selectedFolder && (
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setSaveAsDefault((v) => !v)}
            >
              <div
                role="switch"
                aria-checked={saveAsDefault}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                  saveAsDefault ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    saveAsDefault ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">
                Salvar como pasta padrão
              </span>
            </div>
          )}

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="cursor-pointer h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700"
          >
            Cancelar
          </button>

          {step === "connect" || (!selectedFolder && step !== "picking") ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="cursor-pointer h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Entrar com Google
            </button>
          ) : selectedFolder ? (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="cursor-pointer h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {loading ? "Autenticando..." : "Enviar PDF"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
