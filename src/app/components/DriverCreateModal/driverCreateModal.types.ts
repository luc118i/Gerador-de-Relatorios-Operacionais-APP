import type { Driver } from "../../../domain/drivers";

export type DriverCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (driver: Driver) => void;
};
