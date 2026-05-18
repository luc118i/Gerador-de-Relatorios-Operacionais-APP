import { useState } from "react";

const STORAGE_KEY = "automation_folders";

export type AutomationFolders = {
  relatoriosFolderId: string;
  relatoriosFolderName: string;
};

export function useAutomationFolders() {
  const [config, setConfig] = useState<AutomationFolders | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AutomationFolders) : null;
    } catch {
      return null;
    }
  });

  function save(cfg: AutomationFolders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    setConfig(cfg);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  }

  return { config, save, clear };
}
