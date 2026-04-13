import { useState } from "react";

const STORAGE_KEY = "kandango_drive_folder";

export type DriveFolderConfig = {
  folderId: string;
  folderName: string;
};

export function useDriveFolder() {
  const [config, setConfig] = useState<DriveFolderConfig | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DriveFolderConfig) : null;
    } catch {
      return null;
    }
  });

  function save(cfg: DriveFolderConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    setConfig(cfg);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  }

  return { config, save, clear };
}
