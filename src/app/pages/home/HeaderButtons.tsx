import type { ReactNode } from "react";

export function NavBtn({
  onClick,
  tooltip,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="cursor-pointer p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {tooltip}
      </span>
    </div>
  );
}

export function ActionBtn({
  onClick,
  tooltip,
  primary,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`cursor-pointer p-2 rounded-lg transition-colors ${
          primary
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {tooltip}
      </span>
    </div>
  );
}
