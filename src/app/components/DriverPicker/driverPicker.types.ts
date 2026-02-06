import type { Driver } from "../../../domain/drivers";

export type DriverPickerProps = {
  label: string;
  value: string | null;
  onChange: (driverId: string | null, driver?: Driver) => void;

  required?: boolean;
  disabled?: boolean;

  excludedIds?: string[];
  onCreateRequested?: () => void;
};
