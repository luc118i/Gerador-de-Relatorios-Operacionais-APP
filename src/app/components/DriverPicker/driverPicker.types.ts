import type { Driver } from "../../../domain/drivers";

export type DriverPickerProps = {
  label: string;
  value: string | null;
  onChange: (driverId: string | null, driver?: Driver) => void;
  initialDriver?: { id: string; code: string; name: string; base?: string };

  required?: boolean;
  disabled?: boolean;

  excludedIds?: string[];
  onCreateRequested?: () => void;
};
