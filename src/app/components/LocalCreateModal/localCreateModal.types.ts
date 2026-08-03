import type { Local } from "../../../api/locais.api";

export type LocalCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (local: Local) => void;
  initialNome?: string;
};
