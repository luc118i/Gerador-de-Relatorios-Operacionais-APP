import { CheckCircle2, Loader2 } from "lucide-react";

interface SaveStatusOverlayProps {
  status: "idle" | "saving" | "success";
}

export function SaveStatusOverlay({ status }: SaveStatusOverlayProps) {
  if (status === "idle") return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-md transition-opacity duration-300">
      <div className="bg-white px-10 py-12 rounded-2xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {status === "saving" ? (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Aguarde</h3>
            <p className="text-gray-500">Salvando a ocorrência...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Pronto!</h3>
            <p className="text-gray-500">Ocorrência salva com sucesso.</p>
          </>
        )}
      </div>
    </div>
  );
}
