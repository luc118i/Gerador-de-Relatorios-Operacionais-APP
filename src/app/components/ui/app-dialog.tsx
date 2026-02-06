import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type AppDialogSize = "md" | "lg" | "xl";

const sizeClass: Record<AppDialogSize, string> = {
  md: "w-[min(720px,92vw)] h-[min(520px,86vh)]",
  lg: "w-[min(980px,92vw)] h-[min(680px,86vh)]",
  xl: "w-[min(1180px,94vw)] h-[min(760px,88vh)]",
};

export function AppDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  subtitle?: string;

  size?: AppDialogSize;
  actions?: React.ReactNode;
  showClose?: boolean;

  children: React.ReactNode;

  /** Se false, impede fechar clicando fora (bom pra formulários críticos) */
  closeOnOutside?: boolean;
}) {
  const {
    open,
    onOpenChange,
    title,
    subtitle,
    size = "md",
    actions,
    showClose = true,
    children,
    closeOnOutside = true,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          if (!closeOnOutside) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (!closeOnOutside) e.preventDefault();
        }}
        className={cn(
          sizeClass[size],
          // glass content
          "rounded-2xl border border-white/30 bg-white/75 backdrop-blur-xl",
          "shadow-2xl shadow-black/20",
          // layout
          "flex flex-col overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/20">
          <div className="min-w-0">
            <DialogTitle asChild>
              <h2 className="text-xl font-semibold text-slate-900 truncate">
                {title}
              </h2>
            </DialogTitle>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {actions ? (
              <div className="flex items-center gap-2">{actions}</div>
            ) : null}

            {showClose ? (
              <DialogClose asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg",
                    "h-9 w-9",
                    "text-slate-700 hover:text-slate-900",
                    "hover:bg-white/60",
                    "focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  )}
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            ) : null}
          </div>
        </div>

        {/* Body (scroll interno) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
